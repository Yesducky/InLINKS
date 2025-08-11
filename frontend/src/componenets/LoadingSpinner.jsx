import React from "react";
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  LinearProgress,
  Skeleton,
  Fade,
} from "@mui/material";
import { motion } from "framer-motion";

const LoadingSpinner = ({
  variant = "circular",
  size = 40,
  message = "Loading...",
  backdrop = false,
  color = "#ffffff",
  fullPage = false,
  thickness = 3.6,
}) => {
  const LoadingContent = () => (
    <Fade in={true} timeout={300}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={2}
        sx={{
          ...(fullPage && {
            minHeight: "100vh",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            zIndex: 9999,
          }),
        }}
      >
        {variant === "circular" && (
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress
              size={size}
              thickness={thickness}
              sx={{
                animationDuration: "1.4s",
                color: color,
              }}
            />
          </Box>
        )}

        {variant === "linear" && (
          <Box sx={{ width: "100%", maxWidth: 300 }}>
            <LinearProgress
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "rgba(0, 0, 0, 0.1)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}

        {variant === "dots" && (
          <Box display="flex" gap={1} alignItems="center">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: "easeInOut",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#052639",
                  }}
                />
              </motion.div>
            ))}
          </Box>
        )}

        {variant === "skeleton" && (
          <Box sx={{ width: "100%", maxWidth: 300 }}>
            <Skeleton
              variant="rectangular"
              width="100%"
              height={60}
              sx={{ borderRadius: 2, mb: 1 }}
            />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        )}

        {message && (
          <Fade in={true} timeout={500}>
            <Typography
              variant="body2"
              sx={{
                textAlign: "center",
                fontWeight: 500,
                mt: 1,
                color: color,
                textShadow: "20px 20px 80px rgba(0,0,0,0.15)",
              }}
            >
              {message}
            </Typography>
          </Fade>
        )}
      </Box>
    </Fade>
  );

  if (backdrop) {
    return (
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
        open={true}
      >
        <LoadingContent />
      </Backdrop>
    );
  }

  return <LoadingContent />;
};

export default LoadingSpinner;
