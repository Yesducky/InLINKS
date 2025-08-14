// Preload all images in assets/images
const imageList = [
  "/src/assets/images/bg_1.webp",
  "/src/assets/images/bg_2.webp",
  "/src/assets/images/bg_3.webp",
  "/src/assets/images/bg_4.webp",
  "/src/assets/images/bg_5.webp",
  "/src/assets/images/bg_6.webp",
  "/src/assets/images/bg_7.webp",
  "/src/assets/images/login_1.webp",
  // Add more if needed
];

export function preloadImages(images = imageList) {
  images.forEach((src) => {
    const img = new window.Image();
    img.src = src;
  });
}
