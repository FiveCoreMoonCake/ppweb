export interface Tool {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;       // emoji
  category: "law" | "kids" | "other";
  tags: string[];
}

export const tools: Tool[] = [
  {
    id: "property-law",
    title: "地产权与未来利益通关表",
    description:
      "Property Law MBE 交互式思维导图，涵盖所有产权类型的 Magic Words、配对的未来利益、经典案例及考场陷阱。",
    href: "/property-law",
    icon: "🏠",
    category: "law",
    tags: ["Property Law", "MBE", "思维导图"],
  },
  {
    id: "chinese-literacy",
    title: "中文识字",
    description:
      "学龄前儿童中文识字学习工具，包含学习模式（字卡朗读）和测验模式（听音辨字），支持分组学习和进度跟踪。",
    href: "/chinese-literacy",
    icon: "📖",
    category: "kids",
    tags: ["识字", "学龄前", "听音辨字"],
  },
];

export const categoryLabels: Record<Tool["category"], string> = {
  law: "法学学习",
  kids: "儿童教育",
  other: "其他工具",
};
