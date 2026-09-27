"use client";

import { useEffect, useRef } from "react";

export default function VideoCall() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
  }, []);

  return (
    <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-md">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover bg-slate-900"
      />
    </div>
  );
}