import React from "react";

export const WavyBackground = ({
  children,
  className = "",
  containerClassName = "",
  waveWidth = 50,
  backgroundFill = "hsl(var(--background))",
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
  [key: string]: any;
}) => {
  const getSpeed = () => {
    switch (speed) {
      case "slow":
        return "40s";
      case "fast":
        return "20s";
      default:
        return "20s";
    }
  };

  return (
    <div className={`h-full w-full relative overflow-hidden ${containerClassName}`} {...props}>
      <svg
        className="absolute inset-0 h-full w-full"
        fill="none"
        viewBox="0 0 400 400"
        height="100%"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip)">
          <g opacity={waveOpacity}>
            <path
              fill="url(#gradient1)"
              d="M-175 40.9c39.3-37.7 93.9-59.2 150.1-59.2s110.8 21.5 150.1 59.2c.3.3.5.6.8.9 39.3 37.7 74.9 89.2 90.5 156.7 15.6 67.5 11.2 140.6-26.7 201.1-.1.2-.3.4-.4.6-39.3 60.5-99.2 108.1-161.4 123.8-31.1 7.8-62.2 8.8-92.8 3.3-61.5-11.1-121.3-58.7-160.6-119.2l-.1-.1c-37.9-60.5-42.3-133.6-26.7-201.1s51.2-119 90.5-156.7c.3-.3.5-.6.8-.9Z"
            />
            <path
              fill="url(#gradient2)"
              d="M-189 76.9c39.3-37.7 93.9-59.2 150.1-59.2s110.8 21.5 150.1 59.2c.3.3.5.6.8.9 39.3 37.7 74.9 89.2 90.5 156.7 15.6 67.5 11.2 140.6-26.7 201.1-.1.2-.3.4-.4.6-39.3 60.5-99.2 108.1-161.4 123.8-31.1 7.8-62.2 8.8-92.8 3.3-61.5-11.1-121.3-58.7-160.6-119.2l-.1-.1c-37.9-60.5-42.3-133.6-26.7-201.1s51.2-119 90.5-156.7c.3-.3.5-.6.8-.9Z"
            />
          </g>
        </g>
        <defs>
          <linearGradient
            id="gradient1"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="objectBoundingBox"
          >
            <stop stopColor="hsl(var(--startt-blue))" stopOpacity="0.7">
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                values="0 200 200;360 200 200"
                dur={getSpeed()}
                repeatCount="indefinite"
              />
            </stop>
            <stop stopColor="hsl(var(--startt-purple))" offset="100%" stopOpacity="0.3">
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                values="0 200 200;360 200 200"
                dur={getSpeed()}
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
          <linearGradient
            id="gradient2"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="objectBoundingBox"
          >
            <stop stopColor="hsl(var(--startt-purple))" stopOpacity="0.5">
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                values="360 200 200;0 200 200"
                dur={getSpeed()}
                repeatCount="indefinite"
              />
            </stop>
            <stop stopColor="hsl(var(--startt-blue))" offset="100%" stopOpacity="0.2">
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                values="360 200 200;0 200 200"
                dur={getSpeed()}
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
          <clipPath id="clip">
            <rect width="400" height="400" />
          </clipPath>
        </defs>
      </svg>
      <div className={`relative z-10 ${className}`} style={{ filter: `blur(${blur}px)` }}>
        <div style={{ filter: `blur(${-blur}px)` }}>{children}</div>
      </div>
    </div>
  );
};