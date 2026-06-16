export const prerender = false;

import type { APIRoute } from 'astro';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const BATCH_SYSTEM_PROMPT = `你是一个专业的技术分析师，擅长分析 GitHub 开源项目趋势。用户会给你一批当前页面的热门仓库数据，请用中文生成一份**排行榜分析报告**，包括：

1. **总体趋势**：当前热门仓库的整体技术方向和趋势
2. **最值得关注的 Top 3**：从这批仓库中选出最值得关注的 3 个项目，说明理由
3. **技术热点**：这些仓库集中使用的技术栈和领域
4. **新手推荐**：最适合初学者入门的项目
5. **商业潜力**：哪些项目有较大的商业应用潜力
6. **总结**：一段简短的趋势总结

请使用 Markdown 格式，保持有条理、简洁。`;

const RECOMMEND_SYSTEM_PROMPT = `你是一个专业的技术分析师，擅长根据项目数据推荐最适合不同场景的开源项目。用户会给你一批当前页面的热门仓库数据，请用中文推荐以下场景的最佳选择：

1. **🌟 最适合新手入门**：代码质量好、文档完善、社区活跃、上手简单的项目
2. **💰 最有商业价值**：可以直接应用于商业场景、解决实际业务问题的项目
3. **🔥 最活跃维护**：最近更新频繁、Issue 响应快、社区热度高的项目
4. **🚀 最具创新性**：技术方案新颖、解决前沿问题的项目
5. **⚡ 性能最佳**：在性能、效率方面有突出表现的项目
6. **🎯 实用工具推荐**：日常开发中最实用的工具和库

每个场景推荐 1-2 个项目，给出简短理由。使用 Markdown 格式。`;

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

  const { repos, mode = 'batch' } = body;
  if (!repos || !Array.isArray(repos) || repos.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing or empty repos array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = mode === 'recommend' ? RECOMMEND_SYSTEM_PROMPT : BATCH_SYSTEM_PROMPT;

  const reposContext = repos.map((r: any, i: number) =>
    `${i + 1}. **${r.full_name}** - ⭐${r.stargazers_count} | ${r.language || 'N/A'} | ${r.description || '无描述'}`
  ).join('\n');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `当前页面的热门仓库（共 ${repos.length} 个）：\n\n${reposContext}` },
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
        max_tokens: 2048,
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
