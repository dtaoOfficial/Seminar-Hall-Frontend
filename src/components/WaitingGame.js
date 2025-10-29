import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WaitingGame({ visible, onExit, backendOnline }) {
  const [score, setScore] = useState(0);
  const [dotPos, setDotPos] = useState({ x: 50, y: 50 });
  const [secondsLeft, setSecondsLeft] = useState(60); // 1 minute
  const [showCongrats, setShowCongrats] = useState(false);
  const [showSorry, setShowSorry] = useState(false);
  const [bgAudio, setBgAudio] = useState(null);

  // 🎵 preload background music once
  useEffect(() => {
    const audio = new Audio("/waiting-music.mp3"); // place file in /public
    audio.loop = true;
    audio.volume = 0.2;
    setBgAudio(audio);
  }, []);

  // 🎵 play / pause background music
  useEffect(() => {
    if (visible && bgAudio) {
      bgAudio.currentTime = 0;
      bgAudio.play().catch(() => {});
    } else if (bgAudio) {
      bgAudio.pause();
      bgAudio.currentTime = 0;
    }
  }, [visible, bgAudio]);

  // 🎯 dot animation
  useEffect(() => {
    if (!visible) return;
    const move = setInterval(() => {
      setDotPos({
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
      });
    }, 900);
    return () => clearInterval(move);
  }, [visible]);

  // ⏳ timer countdown
  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(60);
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          // show sorry if backend still offline
          if (!backendOnline) {
            setShowSorry(true);
            setTimeout(() => {
              setShowSorry(false);
              onExit && onExit();
            }, 4000);
          } else {
            onExit && onExit();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, backendOnline, onExit]);

  // ✅ Auto close game when backend wakes
  useEffect(() => {
    if (backendOnline && visible) {
      setShowCongrats(true);
      setTimeout(() => {
        setShowCongrats(false);
        onExit && onExit();
      }, 3500);
    }
  }, [backendOnline, visible, onExit]);

  const handleDotClick = () => {
    setScore((s) => s + 1);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="game"
          className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-lg z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-1">
            🎮 Play while backend wakes up!
          </h3>
          <p className="text-gray-600 text-sm">
            ⏱️ {secondsLeft}s left | Score: {score}
          </p>

          <div className="relative w-[300px] h-[300px] bg-blue-50 mt-4 rounded-2xl border border-blue-200 overflow-hidden shadow-inner">
            <motion.div
              className="absolute w-8 h-8 rounded-full bg-blue-500 cursor-pointer shadow-lg"
              style={{
                left: `${dotPos.x}%`,
                top: `${dotPos.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              onClick={handleDotClick}
            />
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Tap the blue dot — let’s see your reflexes! 😎
          </p>

          <button
            onClick={() => {
              onExit && onExit();
              if (bgAudio) {
                bgAudio.pause();
                bgAudio.currentTime = 0;
              }
            }}
            className="mt-5 px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg text-sm transition"
          >
            Exit Game
          </button>
        </motion.div>
      )}

      {/* ✅ Congrats Animation */}
      {showCongrats && (
        <motion.div
          key="congrats"
          className="absolute inset-0 flex items-center justify-center z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <motion.div
            className="bg-white/80 backdrop-blur-xl px-8 py-6 rounded-3xl shadow-2xl border border-white/50"
            animate={{
              scale: [1, 1.05, 1],
              backgroundColor: ["#fff0", "#ffffffcc", "#fff0"],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <h2 className="text-2xl font-bold text-green-600">
              🎉 Backend Ready!
            </h2>
            <p className="text-gray-700 text-sm mt-2 text-center">
              You scored <b>{score}</b> points — Great job, bro!
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* 😅 Sorry message after 1 minute if still offline */}
      {showSorry && (
        <motion.div
          key="sorry"
          className="absolute inset-0 flex items-center justify-center z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-white/80 backdrop-blur-lg px-8 py-5 rounded-3xl shadow-lg border border-white/50 text-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              😅 Sorry bro...
            </h2>
            <p className="text-gray-600 text-sm">
              The backend is still waking up. Please wait a little more.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
