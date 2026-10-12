"use client";

interface RadarChartProps {
    data: {
        category: string;
        value: number; // 1-5 scale
    }[];
    maxValue?: number;
}

export function RadarChart({ data, maxValue = 5 }: RadarChartProps) {
    const size = 400;
    const center = size / 2;
    const radius = size / 2 - 60;
    const levels = 5;

    const angleSlice = (Math.PI * 2) / data.length;

    // Calculate points for the data polygon
    const getPoint = (value: number, index: number) => {
        const angle = angleSlice * index - Math.PI / 2;
        const r = (value / maxValue) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
        };
    };

    // Create path for data
    const dataPath = data
        .map((item, index) => {
            const point = getPoint(item.value, index);
            return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
        })
        .join(" ") + " Z";

    // Create grid circles
    const gridCircles = Array.from({ length: levels }, (_, i) => {
        const r = ((i + 1) / levels) * radius;
        return r;
    });

    // Create axis lines
    const axisLines = data.map((_, index) => {
        const angle = angleSlice * index - Math.PI / 2;
        return {
            x2: center + radius * Math.cos(angle),
            y2: center + radius * Math.sin(angle),
        };
    });

    // Calculate label positions
    const labels = data.map((item, index) => {
        const angle = angleSlice * index - Math.PI / 2;
        const labelRadius = radius + 30;
        return {
            x: center + labelRadius * Math.cos(angle),
            y: center + labelRadius * Math.sin(angle),
            text: item.category,
        };
    });

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
            {/* Grid circles */}
            {gridCircles.map((r, i) => (
                <circle
                    key={i}
                    cx={center}
                    cy={center}
                    r={r}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    className="dark:stroke-slate-700"
                />
            ))}

            {/* Axis lines */}
            {axisLines.map((line, i) => (
                <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    className="dark:stroke-slate-700"
                />
            ))}

            {/* Data polygon */}
            <path
                d={dataPath}
                fill="rgba(251, 146, 60, 0.2)"
                stroke="#fb923c"
                strokeWidth="2"
                className="dark:fill-orange-600/20 dark:stroke-orange-500"
            />

            {/* Data points */}
            {data.map((item, index) => {
                const point = getPoint(item.value, index);
                return (
                    <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        fill="#fb923c"
                        className="dark:fill-orange-500"
                    />
                );
            })}

            {/* Labels */}
            {labels.map((label, i) => (
                <text
                    key={i}
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm font-medium fill-slate-700 dark:fill-slate-300"
                    style={{ fontSize: "14px" }}
                >
                    {label.text}
                </text>
            ))}
        </svg>
    );
}
