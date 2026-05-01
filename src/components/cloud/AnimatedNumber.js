import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

const DEFAULT_FORMATTER = (value) => Math.round(value).toLocaleString("en-IN");

export default function AnimatedNumber({
  value = 0,
  duration = 0.5,
  formatter = DEFAULT_FORMATTER
}) {
  const [displayValue, setDisplayValue] = useState(Number(value || 0));
  const previousValue = useRef(Number(value || 0));

  useEffect(() => {
    const nextValue = Number(value || 0);
    const controls = animate(previousValue.current, nextValue, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(latest);
      }
    });

    previousValue.current = nextValue;
    return () => controls.stop();
  }, [duration, value]);

  return formatter(displayValue);
}
