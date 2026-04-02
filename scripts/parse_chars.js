const raw = "一 二 三 十 人 口 日 月 水 火 山 石 田 土 木 禾 白 云 天 上 下 大 小 多 少 开 关 来 去 出 入 见 目 耳 头 手 足 走 飞 马 牛 羊 鸟 鱼 车 门 刀 力 心 风 雨 电 光 星 中 本 立 正 长 方 工 厂 广 升 早 晚 今 明 年 春 夏 秋 冬 爸 妈 哥 姐 弟 妹 我 你 他 她 儿 了 子 女 又 不 左 右 前 后 里 外 个 文 字 学 生 王 玉 主 干 千 万 百 只 书 包 尺 笔 同 老 师 课 桌 椅 床 灯 窗 家 房 屋 户 衣 服 巾 毛 纸 吃 喝 饭 菜 果 瓜 豆 肉 蛋 奶 面 米 油 盐 茶 杯 碗 勺 盆 锅 洗 扫 擦 收 拾 跑 跳 爬 站 坐 躺 看 听 说 读 写 画 唱 玩 笑 哭 爱 好 坏 高 低 远 近 快 慢 黑 红 黄 蓝 绿 紫 灰 粉 金 冷 热 暖 轻 重 软 硬 新 旧 真 假 美 丑 有 在 是 也 吗 呢 吧 啊 和 跟 从 到 往 向 把 自 己 别 都 就 才 刚 要 会 能 可 以 想 意 愿 喜 欢 知 道 记 住 行 用 做 干 给 帮 带 找 拿 放 丢 买 卖 钱 作 习 进 回 起 睡 觉 脸 刷 牙 业 游 戏 朋 友 伴 爷 奶 公 叔 伯 姑 姨 舅 东 西 南 北 间 边 面 头 尾 次 月 时 分 夜 声 音 话 语 歌 曲 诗 数 量 条 双 对 群 片 点 线 圆 角 形 图 色 动 静 死 成 强 弱 胖 瘦 忙 闲 苦 甜 酸 辣 香 臭 凉 寒 晴 阴 雪 雷 露 霜 河 湖 海 江 泉 林 森 草 花 叶 根 路 桥 楼 墙 柜 视 机 网 船 行 农 商 兵 医 司 民 空 问 答 让 叫 请 那 这 什 么 完 开 始 最 很 真 全 对 错 没 各 每 常 只 共 位 身 体 鼻 舌 牙 发 眼 脚 家 校 园 场 路 店 街 河 山 石 云 风 树 花";

const chars = raw.split(/\s+/).filter(Boolean);
console.log("Total chars:", chars.length);

const seen = new Set();
const dupes = [];
const unique = [];
for (const c of chars) {
  if (seen.has(c)) { dupes.push(c); continue; }
  seen.add(c);
  unique.push(c);
}
console.log("Unique:", unique.length);
console.log("Duplicates:", dupes.join(" "));
console.log("");

for (let i = 0; i < unique.length; i += 50) {
  const g = unique.slice(i, i + 50);
  console.log("p" + (Math.floor(i/50)+1) + " (" + g.length + "): " + g.join(""));
}
