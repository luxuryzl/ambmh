// 在main.ts中导入

import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import {
  BarChart, // 柱状图
  LineChart, // 折线图
  PieChart, // 饼图
  CandlestickChart, // K 线图
} from "echarts/charts";
import {
  GridComponent, // 直角坐标系
  TooltipComponent, // 提示框
  LegendComponent, // 图例
  DataZoomComponent, // 数据区域缩放
  AxisPointerComponent, // 坐标轴指示器
  TitleComponent, // 标题
  MarkLineComponent, // 标记线
  MarkPointComponent, // 标记点
} from "echarts/components";

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  CandlestickChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  AxisPointerComponent,
  TitleComponent,
  MarkLineComponent,
  MarkPointComponent,
]);
