
"use client";

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface DashboardChartsProps {
  type: 'bar' | 'horizontalBar';
  data: any[];
  dataKey: string;
  nameKey: string;
  color: string;
}

export default function DashboardCharts({ type, data, dataKey, nameKey, color }: DashboardChartsProps) {
  if (type === 'bar') {
    return (
      <ChartContainer config={{
        [dataKey]: {
          label: nameKey,
          color: color,
        },
      }} className="h-[250px] w-full">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <XAxis dataKey={nameKey} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer config={{
      [dataKey]: {
        label: nameKey,
        color: color,
      },
    }} className="h-[250px] w-full">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <XAxis type="number" hide />
        <YAxis dataKey={nameKey} type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Bar dataKey={dataKey} fill={color} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
