export const prerender = false;

import type { APIRoute } from 'astro';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一个专业的技术分析师，擅长分析 GitHub 开源项目。当用户给你一个仓库信息时，请用中文从以下维度进行总结：

1. **项目简介**：这个项目是什么，做什么用的
2. **解决的问题**：它解决了什么痛点
3. **技术栈**：使用的主要技术和框架
4. **为什么火**：分析它受欢迎的可能原因
5. **适合人群**：什么样的开发者或团队适合使用

请保持简洁、有条理，使用 Markdown 格式。如果用户追问，请基于已有信息深入分析。`;

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { repo, history = [] } = body;
  if (!repo || !repo.full_name) {
    return new Response(JSON.stringify({ error: 'Missing repo info' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const repoContext = `仓库信息：
- 名称：${repo.full_name}
- 描述：${repo.description || '无'}
- 语言：${repo.language || '未知'}
- Stars：${repo.stargazers_count}
- 主题标签：${repo.topics?.join(', ') || '无'}
- 链接：${repo.html_url}`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: repoContext },
    ...history,
  ];

  let deepseekResponse: Response;
  try {
    deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `DeepSeek API request failed: ${err.message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!deepseekResponse.ok) {
    const errText = await deepseekResponse.text().catch(() => 'Unknown error');
    return new Response(JSON.stringify({ error: `DeepSeek API error: ${deepseekResponse.status} - ${errText}` }), {
      status: deepseekResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stream the SSE response back to the client
  const reader = deepseekResponse.body?.getReader();
  if (!reader) {
    return new Response(JSON.stringify({ error: 'No response body from DeepSeek' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
