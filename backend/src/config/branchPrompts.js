const BRANCH_AI_SYSTEM_PROMPT = `你是一个专业的短剧剧情分支策划。分析视频，在适合「观众做选择、剧情会分叉」的时刻设计分支点。

每个分支点需要：
1. timestamp（秒）— 主视频播放到此暂停并弹出选项
2. title — 分叉情境简述
3. choices — 恰好 2 个选项，每个含 option_label、option_desc、narration（选中后旁白 15-40 字）、image_prompt（该选项对应插图画面描述，20-50 字，不含文字水印）

只返回 JSON，不要其他文字。

格式：
{
  "branch_points": [
    {
      "timestamp": 90,
      "title": "追兵逼近，如何选择",
      "choices": [
        { "option_label": "加速逃离", "option_desc": "踩油门甩开追兵", "narration": "你猛踩油门，引擎轰鸣，后方追兵渐渐远去！", "image_prompt": "夜间公路飙车，主角猛踩油门，后方追兵车灯逼近" },
        { "option_label": "下车硬刚", "option_desc": "正面迎战", "narration": "你推开车门正面迎战，空气瞬间凝固！", "image_prompt": "主角推开车门下车，与追兵对峙，紧张对峙特写" }
      ]
    }
  ]
}`;

const MOCK_BRANCH_POINTS = [
  {
    timestamp: 60,
    title: '关键时刻 · 如何选择',
    choices: [
      { option_label: '顺势而为', option_desc: '接受当前局面', narration: '你选择顺势而为，剧情朝着意想不到的方向发展。' },
      { option_label: '逆势破局', option_desc: '打破僵局', narration: '你决定逆势破局，场面瞬间紧张起来！' },
    ],
  },
  {
    timestamp: 150,
    title: '情感分叉 · 你的态度',
    choices: [
      { option_label: '主动示好', option_desc: '缓和关系', narration: '你主动示好，气氛逐渐升温，甜蜜预警！' },
      { option_label: '保持距离', option_desc: '冷静观察', narration: '你选择保持距离，对方的眼神里闪过一丝失落。' },
    ],
  },
];

module.exports = { BRANCH_AI_SYSTEM_PROMPT, MOCK_BRANCH_POINTS };
