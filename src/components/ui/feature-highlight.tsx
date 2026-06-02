import * as React from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeatureHighlightProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  features: React.ReactNode[];
  footer?: React.ReactNode;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 18 },
  },
};

const FeatureHighlight = React.forwardRef<HTMLDivElement, FeatureHighlightProps>(
  ({ className, eyebrow, title, features, footer, ...props }, ref) => {
    const [hovered, setHovered] = React.useState<number | null>(null);

    return (
      <motion.div
        ref={ref}
        className={cn(
          "mx-auto w-full max-w-6xl px-4 py-12 sm:py-16",
          className,
        )}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        {...(props as any)}
      >
        <div className="grid gap-10 md:grid-cols-2 md:gap-12 md:items-start">
          <div className="text-left md:sticky md:top-24">
            {eyebrow && (
              <motion.div
                variants={itemVariants}
                className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#8B2E4F]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#8B2E4F]"
              >
                {eyebrow}
              </motion.div>
            )}

            <motion.h2
              variants={itemVariants}
              className="text-2xl font-bold tracking-tight text-[#1A1A2E] sm:text-3xl md:text-4xl"
            >
              {title}
            </motion.h2>

            {footer && (
              <motion.div
                variants={itemVariants}
                className="mt-6 hidden md:inline-flex items-center justify-center rounded-full bg-[#8B2E4F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm sm:text-base"
              >
                {footer}
              </motion.div>
            )}
          </div>

          <motion.ul
            variants={containerVariants}
            onMouseLeave={() => setHovered(null)}
            className="flex flex-col items-start gap-2 sm:gap-3"
          >
          {features.map((feature, index) => {
            const isHovered = hovered === index;
            const isDimmed = hovered !== null && !isHovered;
            return (
              <motion.li
                key={index}
                variants={itemVariants}
                onMouseEnter={() => setHovered(index)}
                className={cn(
                  "group cursor-default text-lg leading-relaxed sm:text-xl md:text-2xl",
                  "transition-all duration-300 ease-out will-change-transform",
                  isHovered
                    ? "text-[#8B2E4F] sm:translate-x-1 [text-shadow:0_1px_0_rgba(139,46,79,0.08)]"
                    : isDimmed
                      ? "text-gray-400 opacity-60 blur-[0.3px]"
                      : "text-gray-700",
                )}
              >
                {feature}
              </motion.li>
            );
          })}
          </motion.ul>

          {footer && (
            <motion.div
              variants={itemVariants}
              className="mt-2 inline-flex items-center justify-center self-start rounded-full bg-[#8B2E4F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm sm:text-base md:hidden"
            >
              {footer}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  },
);

FeatureHighlight.displayName = "FeatureHighlight";

export { FeatureHighlight };