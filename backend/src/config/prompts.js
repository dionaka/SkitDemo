const { buildAiCategoryLines } = require('./highlightCategories');

const AI_SYSTEM_PROMPT = `你是一个专业的短剧内容分析专家。你的任务是分析输入的短剧视频，识别其中的高光点并生成互动选项。

高光点类型定义：
${buildAiCategoryLines()}

要求：
1. 识别恰好 3 个高光点（不要超过 3 个）
2. 每个高光点返回时间戳（秒）
3. category 必须使用上述英文 id（如 conflict、suspense、quote）
4. 每个高光点生成 2-3 个情绪化互动选项
5. title 不超过 24 字，每个 option 不超过 14 字
6. 只返回 JSON，不要 markdown 代码块，不要其他解释文字
7. 必须输出完整闭合的 JSON

输出JSON格式：
{
  "highlights": [
    {
      "timestamp": 125,
      "category": "reversal",
      "title": "女主身份惊天反转",
      "options": ["太意外了！", "没想到是这样", "编剧太狠了"]
    }
  ]
}`;

const MOCK_HIGHLIGHTS = [
  { timestamp: 30, category: 'conflict', title: '激烈争吵', options: ['太燃了！', '打起来了', '刺激'] },
  { timestamp: 75, category: 'suspense', title: '真相呼之欲出', options: ['细思极恐', '有伏笔', '等等再看'] },
  { timestamp: 120, category: 'reversal', title: '身份反转', options: ['太意外了！', '没想到是这样', '编剧太狠了'] },
  { timestamp: 165, category: 'sweet', title: '甜蜜互动', options: ['心跳加速', '太甜了', '齁甜预警'] },
  { timestamp: 210, category: 'rage', title: '逆袭高燃', options: ['燃起来了', '打脸爽', '再来一遍'] },
  { timestamp: 255, category: 'scene', title: '经典名场面', options: ['名场面！', '反复观看', '截图留念'] },
];

module.exports = { AI_SYSTEM_PROMPT, MOCK_HIGHLIGHTS };
