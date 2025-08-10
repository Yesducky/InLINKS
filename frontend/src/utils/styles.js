import bg_1 from "../assets/images/bg_1.webp";
import bg_2 from "../assets/images/bg_2.webp";
import bg_3 from "../assets/images/bg_3.webp";
import bg_4 from "../assets/images/bg_4.webp";
import bg_5 from "../assets/images/bg_5.webp";
import bg_6 from "../assets/images/bg_6.webp";
import bg_7 from "../assets/images/bg_7.webp";

// Dynamic background styles function
export const createBackgroundStyles = (bgImage = bg_6) => ({
  backgroundImage: `url(${bgImage})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  maxHeight: "100vh",
  overflow: "scroll",
});

// Default background styles (for backward compatibility)
export const backgroundStyles = createBackgroundStyles();

// Predefined background variants (add more as needed)
export const backgroundVariants = {
  login: createBackgroundStyles(bg_5),
  inventory: createBackgroundStyles(bg_6),
  projects: createBackgroundStyles(bg_5),
  my_tasks: createBackgroundStyles(bg_3),
  dashboard: createBackgroundStyles(bg_7),
  user_management: createBackgroundStyles(bg_1),
  settings: createBackgroundStyles(bg_2),
  scan: createBackgroundStyles(bg_4),
};

export const commonAnimationVariantsOne = {
  pageVariants: {
    initial: { opacity: 0, x: 0, scale: 0.95 },
    in: { opacity: 1, x: 0, scale: 1 },
    out: { opacity: 0, x: -50, scale: 0.95 },
  },
  pageTransition: {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  },
  cardVariants: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
};
