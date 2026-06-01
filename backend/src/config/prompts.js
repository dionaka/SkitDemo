const AI_SYSTEM_PROMPT = `你是一个专业的短剧内容分析专家。你的任务是分析输入的短剧视频，识别其中的高光点并生成互动选项。

高光点类型定义：
- conflict（冲突）：激烈争吵、打斗场面、矛盾激化
- reversal（反转）：剧情突变、身份揭示、出人意料的转折
- sweet（撒糖）：甜蜜互动、暧昧场景、情感升温
- scene（名场面）：经典镜头、高能时刻、值得反复观看的场景

要求：
1. 识别恰好 3 个高光点（不要超过 3 个）
2. 每个高光点返回时间戳（秒）
3. 每个高光点生成 2-3 个情绪化互动选项
4. title 不超过 24 字，每个 option 不超过 14 字
5. 只返回 JSON，不要 markdown 代码块，不要其他解释文字
6. 必须输出完整闭合的 JSON

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
  { timestamp: 90, category: 'reversal', title: '身份反转', options: ['太意外了！', '没想到是这样', '编剧太狠了'] },
  { timestamp: 150, category: 'sweet', title: '甜蜜互动', options: ['心跳加速', '太甜了', '齁甜预警'] },
  { timestamp: 220, category: 'scene', title: '经典名场面', options: ['名场面！', '反复观看', '截图留念'] },
];

module.exports = { AI_SYSTEM_PROMPT, MOCK_HIGHLIGHTS };
