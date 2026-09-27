
"use client";

import { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import socket from "@/lib/socket";
import { useCallStore } from "@/store/useCallStore";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  User,
} from "lucide-react";

interface CallWindowProps {
  remoteUserId: string;
  onEndCall: () => void;
}

export default function CallWindow({
  remoteUserId,
  onEndCall,
}: CallWindowProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingSignalsRef = useRef<SimplePeer.SignalData[]>([]);
  const receivedSignalsRef = useRef(new Set<string>());

  const [callStatus, setCallStatus] = useState("Connecting...");
  const [callDuration, setCallDuration] = useState(0);
  const [remoteConnected, setRemoteConnected] =
    useState(false);

  const {
    isInCall,
    callType,
    isVideoEnabled,
    isAudioEnabled,
    setIsVideoEnabled,
    setIsAudioEnabled,
    setLocalStream,
    setRemoteStream,
    isCaller,
    endCall,
  } = useCallStore();

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isInCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isInCall]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  };

  const cleanupCall = () => {
    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    if (
      peerRef.current &&
      !peerRef.current.destroyed
    ) {
      peerRef.current.destroy();
    }

    peerRef.current = null;
    pendingSignalsRef.current = [];
    receivedSignalsRef.current.clear();
  };

  // Initialize call
  useEffect(() => {
    if (!isInCall || !remoteUserId) return;

    const initCall = async () => {
      let stream: MediaStream | null = null;

      try {
        setCallStatus("Accessing media...");

        if (callType === "video") {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: true,
            });
          } catch (videoError) {
            console.warn("Video unavailable, falling back to audio-only:", videoError);

            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
              });
              setCallStatus("Camera unavailable. Continuing with audio call.");
            } catch (audioError) {
              console.warn("Audio unavailable, continuing without local media:", audioError);
              setCallStatus("Microphone unavailable. Continuing without local media.");
            }
          }
        } else {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });
          } catch (audioError) {
            console.warn("Microphone unavailable:", audioError);
            setCallStatus("Microphone unavailable. Continuing without local media.");
          }
        }

        if (cancelled) {
          stream?.getTracks().forEach((track) => track.stop());
          return;
        }

        if (stream) {
          streamRef.current = stream;
          setLocalStream(stream);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } else {
          streamRef.current = null;
          setLocalStream(null);
        }

        setCallStatus(stream ? "Connecting..." : "Connecting without local media...");

        const peer = new SimplePeer({
          initiator: isCaller,
          trickle: false,
          stream: stream ?? undefined,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
            ],
          },
        });

        peerRef.current = peer;

        peer.on("signal", (signalData) => {
          socket.emit("call-signal", {
            to: remoteUserId,
            signal: signalData,
          });
        });

        peer.on("stream", (remoteStream) => {
          setRemoteStream(remoteStream);
          setRemoteConnected(true);

          if (remoteStream.getVideoTracks().length > 0) {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          }

          if (remoteStream.getAudioTracks().length > 0 && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current
              .play()
              .catch((playError) => {
                console.warn("Audio playback blocked:", playError);
              });
          }

          setCallStatus("Connected");
        });

        peer.on("connect", () => {
          setCallStatus("Connected");
        });

        peer.on("error", (err) => {
          console.error("Peer error:", err);
          setCallStatus("Connection failed");
        });

        for (const pendingSignal of pendingSignalsRef.current) {
          try {
            peer.signal(pendingSignal);
          } catch (error) {
            console.error("Failed to apply queued call signal:", error);
          }
        }
        pendingSignalsRef.current = [];

        peer.on("close", () => {
          cleanupCall();
          onEndCall();
        });

      } catch (error) {
        console.error("Call initialization error:", error);
        setCallStatus("Unable to start call. Please try again.");
      }
    };

    let cancelled = false;
    initCall();

    return () => {
      cancelled = true;
      cleanupCall();
    };
  }, [isInCall, remoteUserId, callType]);

  // Listen for signals
  useEffect(() => {
    const handleSignal = (data: {
      from?: string;
      signal?: SimplePeer.SignalData;
    }) => {
      if (!data.signal || (data.from && data.from !== remoteUserId)) return;

      const signalKey = JSON.stringify(data.signal);
      if (receivedSignalsRef.current.has(signalKey)) return;
      receivedSignalsRef.current.add(signalKey);

      if (peerRef.current) {
        try {
          peerRef.current.signal(data.signal);
        } catch (error) {
          console.error("Failed to apply call signal:", error);
        }
      } else {
        pendingSignalsRef.current.push(data.signal);
      }
    };

    socket.on("call-signal", handleSignal);

    return () => {
      socket.off("call-signal", handleSignal);
    };
  }, [remoteUserId]);

  // Toggle Mic
  const toggleAudio = () => {
    if (!streamRef.current) return;

    const audioTrack = streamRef.current.getAudioTracks()[0];

    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  // End Call
  const handleEndCall = () => {
    cleanupCall();

    socket.emit("call-end", {
      to: remoteUserId,
    });

    endCall();

    onEndCall();
  };

  return (
    <div className="fixed inset-0 z-999 bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-base sm:text-lg">
            {callType === "video"
              ? "Video Call"
              : "Audio Call"}
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm">
            {callStatus}
          </p>
        </div>

        <div className="text-white text-sm sm:text-base font-medium">
          {formatTime(callDuration)}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {/* Remote Video */}
        {callType === "video" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-white">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <User size={60} />
            </div>

            <p className="text-lg sm:text-2xl font-semibold">
              Audio Call
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Phone className="animate-pulse" />
              <span className="text-slate-300">
                Connected...
              </span>
            </div>
          </div>
        )}

        {/* No Remote Video */}
        {callType === "video" &&
          !remoteConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900">
              <div className="w-28 h-28 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                <User size={60} />
              </div>

              <p className="text-lg font-semibold">
                Waiting for user...
              </p>
            </div>
          )}

        {/* In audio-only calls we need a hidden audio element */}
        {callType === "audio" && (
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            muted={false}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Local Video */}
        {callType === "video" && (
          <div className="absolute bottom-24 right-4 sm:right-6 w-28 sm:w-40 md:w-56 h-40 sm:h-52 md:h-72 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-800">
            {isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <VideoOff size={30} />
                <p className="text-xs mt-2">
                  Camera Off
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md py-5 px-4">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Audio */}
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${isAudioEnabled
              ? "bg-slate-700 hover:bg-slate-600"
              : "bg-red-600 hover:bg-red-700"
              }`}
          >
            {isAudioEnabled ? (
              <Mic className="text-white" />
            ) : (
              <MicOff className="text-white" />
            )}
          </button>

          {/* Video */}
          {callType === "video" && (
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${isVideoEnabled
                ? "bg-slate-700 hover:bg-slate-600"
                : "bg-red-600 hover:bg-red-700"
                }`}
            >
              {isVideoEnabled ? (
                <Video className="text-white" />
              ) : (
                <VideoOff className="text-white" />
              )}
            </button>
          )}

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-2xl transition-all duration-200"
          >
            <PhoneOff className="text-white" size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}