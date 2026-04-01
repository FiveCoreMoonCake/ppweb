"use client";

import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { BookOpen, RefreshCw, Key, ShieldAlert } from "lucide-react";
import { propertyLawData } from "@/data/property-law";

const treeData = {
  name: "土地地产权体系\nEstates in Land",
  children: [
    {
      name: "当前地产权\nPresent Estates",
      children: [
        { name: "绝对无条件所有权\nFee Simple Absolute", value: "fsa" },
        { name: "终身地产权\nLife Estate", value: "le-all" },
        {
          name: "可作废所有权\nDefeasible Fees",
          children: [
            { name: "可定止所有权\nFSD", value: "fsd" },
            { name: "附条件后续所有权\nFSSCS", value: "fsscs" },
            { name: "附执行限制所有权\nFSSEL", value: "fssel" },
          ],
        },
      ],
    },
    {
      name: "未来利益\nFuture Interests",
      children: [
        {
          name: "原所有人保留\nRetained by Grantor",
          children: [
            { name: "归复权\nReversion", value: "le-rev" },
            { name: "收回之可能性\nPossibility of Reverter", value: "fsd" },
            { name: "进入权/终止权\nRight of Entry", value: "fsscs" },
          ],
        },
        {
          name: "赋予第三方\nCreated in Grantee",
          children: [
            {
              name: "剩余权\nRemainder",
              children: [
                { name: "既得剩余权\nVested Remainder", value: "le-vr" },
                { name: "或有剩余权\nContingent Remainder", value: "le-cr" },
              ]
            },
            {
              name: "执行性权益\nExecutory Interest",
              children: [
                { name: "转移型\nShifting", value: "fssel" },
                { name: "弹跳型\nSpringing", value: "springing" }
              ]
            },
          ],
        },
      ],
    },
  ],
};

function getItemsForNode(nodeName: string) {
  if (nodeName.includes("绝对无条件所有权")) return propertyLawData.filter((i) => i.id === "fsa");
  if (nodeName.includes("可定止所有权") || nodeName.includes("收回之可能性")) return propertyLawData.filter((i) => i.id === "fsd");
  if (nodeName.includes("附条件后续所有权") || nodeName.includes("进入权/终止权")) return propertyLawData.filter((i) => i.id === "fsscs");
  if (nodeName.includes("执行限制") || nodeName.includes("转移型")) return propertyLawData.filter((i) => i.id === "fssel");
  if (nodeName.includes("弹跳型")) return propertyLawData.filter((i) => i.id === "springing");
  if (nodeName.includes("归复权")) return propertyLawData.filter((i) => i.id === "le-rev");
  if (nodeName.includes("既得剩余权")) return propertyLawData.filter((i) => i.id === "le-vr");
  if (nodeName.includes("或有剩余权")) return propertyLawData.filter((i) => i.id === "le-cr");
  if (nodeName.includes("终身地产权")) return propertyLawData.filter((i) => i.id.startsWith("le-"));
  if (nodeName.includes("剩余权")) return propertyLawData.filter((i) => i.id === "le-cr" || i.id === "le-vr");
  if (nodeName.includes("执行性权益")) return propertyLawData.filter((i) => i.id === "fssel" || i.id === "springing");
  return [];
}

export default function PropertyLawMindMap() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartOptions = {
    tooltip: { show: false },
    series: [
      {
        type: "tree",
        data: [treeData],
        top: "8%",
        left: "12%",
        bottom: "8%",
        right: "20%", // Provide enough space for right labels
        symbolSize: 10,
        initialTreeDepth: -1, // Unfold all nodes perfectly
        label: {
          position: "left",
          verticalAlign: "middle",
          align: "right",
          fontSize: 14,
          lineHeight: 18,
          color: "#334155", // slate-700
          backgroundColor: "#f8fafc", // slate-50
          padding: [6, 10],
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#cbd5e1", // slate-300
          shadowBlur: 4,
          shadowColor: "rgba(0,0,0,0.05)",
        },
        leaves: {
          label: {
            position: "right",
            verticalAlign: "middle",
            align: "left",
            backgroundColor: "#e0f2fe", // sky-100 (light bright blue)
            borderColor: "#bae6fd", // sky-200
            color: "#0369a1", // sky-700
          },
        },
        itemStyle: {
          color: "#38bdf8", // sky-400
          borderColor: "#0284c7", // sky-600
          borderWidth: 2,
        },
        lineStyle: {
          color: "#94a3b8", // slate-400
          width: 1.5,
          curveness: 0.4, 
        },
        emphasis: { focus: "none" },
        expandAndCollapse: true,
        animationDuration: 300,
        animationDurationUpdate: 300,
      },
    ],
  };

  const handleNodeClick = (params: any) => {
    const items = getItemsForNode(params.data.name);
    if (items.length > 0) {
      setSelectedNode(params.data.name);
    } else {
      setSelectedNode(null);
    }
  };

  const details = selectedNode ? getItemsForNode(selectedNode) : [];

  if (!isClient) {
    return (
      <div className="h-screen bg-white flex justify-center items-center text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#f1f5f9] text-slate-800 font-sans overflow-hidden">
      
      {/* 
        Main Canvas for ECharts.
        Fixed width ratio prevents the canvas from resizing/shifting when a node is clicked. 
      */}
      <div className="relative h-full w-full md:w-[65%] border-r border-slate-200 bg-white shadow-sm z-10">
        <div className="absolute top-6 left-8 z-20 pointer-events-none">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">
            地产权与未来利益通关表
          </h1>
          <p className="text-slate-500 text-sm">点击分支末端亮色节点查看考点详情</p>
        </div>

        <ReactECharts
          option={chartOptions}
          style={{ height: "100%", width: "100%" }}
          onEvents={{ click: handleNodeClick }}
        />
      </div>

      {/* 
        Side Panel for Details
        Always strictly occupies 35% so it never blocks the map.
      */}
      <div className="w-full md:w-[35%] h-full bg-[#f8fafc] flex flex-col relative">
        {!selectedNode || details.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <BookOpen className="w-16 h-16 mb-4 text-slate-200" />
            <p className="text-lg font-medium text-slate-500">选择一个权利节点</p>
            <p className="text-sm mt-2">点击左侧图表中的具体权力，即可在此平行查看相应的法条、Magic Words 及 MBE 测试陷阱。</p>
          </div>
        ) : (
          <>
            <div className="bg-white px-6 py-5 border-b border-slate-200 flex justify-between items-center shadow-sm sticky top-0 z-10">
              <h2 className="text-base font-bold text-slate-800 flex-1 whitespace-pre-wrap leading-tight">
                {selectedNode.replace('\n', ' - ')}
              </h2>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium ml-4 bg-slate-100 px-3 py-1.5 rounded-md hover:bg-slate-200"
              >
                关闭
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">
              {details.map((item, i) => (
                <div key={item.id} className="space-y-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900 mb-3 leading-snug">
                      {item.name}
                    </h3>

                    <div className="flex flex-wrap gap-2 mb-5">
                      {item.magicWords.map((word, wIdx) => (
                        <span
                          key={wIdx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-700 text-xs font-mono border border-amber-200 font-semibold shadow-sm"
                        >
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          {word}
                        </span>
                      ))}
                    </div>

                    {/* Future Interest Detail Box */}
                    <div className="bg-sky-50 rounded-lg p-4 border border-sky-100 space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-sky-600/80 uppercase font-bold tracking-wider">
                            配对的未来利益
                          </p>
                          <p className="text-sm font-bold text-sky-900">
                            {item.futureInterest.name}
                          </p>
                        </div>
                        {item.futureInterest.holder !== "无" && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-sky-600/80 uppercase font-bold tracking-wider">
                              持有者
                            </p>
                            <p className="text-sm font-medium text-slate-700">
                              {item.futureInterest.holder}
                            </p>
                          </div>
                        )}
                        {item.futureInterest.mechanism !== "无" && (
                          <div className="col-span-2 space-y-1.5 pt-3 border-t border-sky-200/50">
                            <p className="text-[11px] text-sky-600/80 uppercase font-bold tracking-wider mb-1">
                              触发机制
                            </p>
                            <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                              <RefreshCw className="w-3.5 h-3.5" />
                              {item.futureInterest.mechanism}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cases & Tricks */}
                    <div className="space-y-4">
                      <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                        <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" /> 经典案例
                        </h4>
                        <p className="text-[13px] leading-relaxed text-slate-700 font-medium">
                          {item.caseStudy}
                        </p>
                      </div>

                      <div className="bg-rose-50 rounded-lg p-4 border border-rose-200 shadow-sm">
                        <h4 className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" /> 考场陷阱 (MBE Tricks)
                        </h4>
                        <p className="text-[13px] leading-relaxed text-slate-800 font-medium">
                          {item.tricks}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
