// import { create } from "zustand";

// interface CallState {
//   isInCall: boolean;
//   isVideoEnabled: boolean;
//   isAudioEnabled: boolean;
//   remoteUserId: string | null;
//   localStream: MediaStream | null;
//   remoteStream: MediaStream | null;
//   callType: "audio" | "video" | null;
  
//   setIsInCall: (value: boolean) => void;
//   setIsVideoEnabled: (value: boolean) => void;
//   setIsAudioEnabled: (value: boolean) => void;
//   setRemoteUserId: (id: string | null) => void;
//   setLocalStream: (stream: MediaStream | null) => void;
//   setRemoteStream: (stream: MediaStream | null) => void;
//   setCallType: (type: "audio" | "video" | null) => void;
//   endCall: () => void;
// }

// export const useCallStore = create<CallState>((set) => ({
//   isInCall: false,
//   isVideoEnabled: false,
//   isAudioEnabled: true,
//   remoteUserId: null,
//   localStream: null,
//   remoteStream: null,
//   callType: null,

//   setIsInCall: (value) => set({ isInCall: value }),
//   setIsVideoEnabled: (value) => set({ isVideoEnabled: value }),
//   setIsAudioEnabled: (value) => set({ isAudioEnabled: value }),
//   setRemoteUserId: (id) => set({ remoteUserId: id }),
//   setLocalStream: (stream) => set({ localStream: stream }),
//   setRemoteStream: (stream) => set({ remoteStream: stream }),
//   setCallType: (type) => set({ callType: type }),

//   endCall: () =>
//     set({
//       isInCall: false,
//       isVideoEnabled: false,
//       isAudioEnabled: true,
//       remoteUserId: null,
//       localStream: null,
//       remoteStream: null,
//       callType: null,
//     }),
// }));


import { create } from "zustand";

interface CallState {
  isInCall: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;

  remoteUserId: string | null;

  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  callType: "audio" | "video" | null;

  isCaller: boolean;

  setIsInCall: (value: boolean) => void;
  setIsVideoEnabled: (value: boolean) => void;
  setIsAudioEnabled: (value: boolean) => void;

  setRemoteUserId: (id: string | null) => void;

  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;

  setCallType: (type: "audio" | "video" | null) => void;

  setIsCaller: (value: boolean) => void;

  endCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  isInCall: false,

  isVideoEnabled: true,

  isAudioEnabled: true,

  remoteUserId: null,

  localStream: null,

  remoteStream: null,

  callType: null,

  isCaller: false,

  setIsInCall: (value) => set({ isInCall: value }),

  setIsVideoEnabled: (value) =>
    set({ isVideoEnabled: value }),

  setIsAudioEnabled: (value) =>
    set({ isAudioEnabled: value }),

  setRemoteUserId: (id) =>
    set({ remoteUserId: id }),

  setLocalStream: (stream) =>
    set({ localStream: stream }),

  setRemoteStream: (stream) =>
    set({ remoteStream: stream }),

  setCallType: (type) =>
    set({ callType: type }),

  setIsCaller: (value) =>
    set({ isCaller: value }),

  // endCall: () => {
  //   const { localStream, remoteStream } = get();

  //   localStream?.getTracks().forEach((t) =>
  //     t.stop()
  //   );

  //   remoteStream?.getTracks().forEach((t) =>
  //     t.stop()
  //   );

  //   set({
  //     isInCall: false,
  //     isVideoEnabled: true,
  //     isAudioEnabled: true,
  //     remoteUserId: null,
  //     localStream: null,
  //     remoteStream: null,
  //     callType: null,
  //     isCaller: false,
  //   });
  // },
  endCall: () => {
  const state = get();

  state.localStream
    ?.getTracks()
    .forEach((track) => track.stop());

  state.remoteStream
    ?.getTracks()
    .forEach((track) => track.stop());

  set({
    isInCall: false,
    isVideoEnabled: true,
    isAudioEnabled: true,
    remoteUserId: null,
    localStream: null,
    remoteStream: null,
    callType: null,
    isCaller: false,
  });
},
}));