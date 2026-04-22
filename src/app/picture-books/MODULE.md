# 绘本馆模块

> 路由: `/picture-books` | 面向儿童
> 有声绘本逐字高亮朗读 (点读笔交互)

---

## 概述

- **书架**：封面大图卡片 + 年龄标签 + 页数
- **阅读器**：桌面/平板两页对开，手机竖屏单页
- **点读交互**：点击文字区域 → 整页朗读 + 字级高亮
- **生词**：最后一页统一展示生词汇总表
- **自动播放**：header 按钮触发，连续朗读全书
- RequireAuth 守卫
- 目前 1 本书：《小白兔找萝卜》，SVG 占位插图

## 文件

```
picture-books/
├── page.tsx         # 全部代码 (~420 行)
└── MODULE.md        # 本文档
```

## book.json 数据格式

```typescript
interface BookPage {
  text: string;
  subtitle?: string;
  image?: string;           // 插图路径
  layout?: "image-top" | "image-full" | "text-only" | "vocab-summary";
  audio: string;            // MP3 路径
  words: WordBoundary[];    // 字级时间轴
  emoji?: string;           // fallback
  bg?: string;              // fallback 渐变色
}
// 最后一页 layout: "vocab-summary" 汇总生词
```

绘本数据存放在 `public/books/<book-id>/`（book.json + p1~p10.mp3）。

## 组件结构

```
PictureBooksInner → BookShelf | BookReader
  BookReader → SpreadView (桌面两页对开) | SinglePage (手机单页)
    PagePanel (插图背景 + 可点击文字浮层)
    HighlightedText (字级高亮)
    VocabSummaryPanel (生词汇总页)
```

## 待办

- [x] 静态资源加载验证
- [x] 恢复 RequireAuth 守卫
- [ ] 用 AI 插图替换 SVG 占位图
- [ ] 绘本生产 pipeline（多 agent 故事生成 + AI 插图 + TTS 配音）
