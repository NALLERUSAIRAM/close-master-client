import React, { useEffect, useRef, useState } from "react";

export default function VoiceChatBar({ socket, activeSockets }) {
  const [stream, setStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const peersRef = useRef({});
  const audioContainerRef = useRef(null);

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  };

  useEffect(() => {
    if (!socket) return;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((currentStream) => {
        setStream(currentStream);

        socket.on("voice_signal", async ({ from, signal }) => {
          let pc = peersRef.current[from];
          if (!pc) {
            pc = createPeerConnection(from, currentStream, false);
          }

          if (signal.type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("voice_signal", { to: from, signal: pc.localDescription });
          } else if (signal.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
          } else if (signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal));
          }
        });

      })
      .catch((err) => console.log("Microphone permission denied:", err));

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket]);

  useEffect(() => {
    if (!activeSockets || !socket || !stream) return;

    activeSockets.forEach(targetSocketId => {
      if (targetSocketId !== socket.id && !peersRef.current[targetSocketId]) {
        createPeerConnection(targetSocketId, stream, true);
      }
    });
  }, [activeSockets, socket, stream]);

  const createPeerConnection = (targetSocketId, currentStream, isInitiator) => {
    const pc = new RTCPeerConnection(configuration);
    peersRef.current[targetSocketId] = pc;

    currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("voice_signal", { to: targetSocketId, signal: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      let audio = document.getElementById(`audio-${targetSocketId}`);
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = `audio-${targetSocketId}`;
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.muted = soundMuted;
        if (audioContainerRef.current) {
          audioContainerRef.current.appendChild(audio);
        }
      }
    };

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit("voice_signal", { to: targetSocketId, signal: offer });
      }).catch(err => console.log("Offer error:", err));
    }

    return pc;
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSound = () => {
    setSoundMuted(!soundMuted);
    if (audioContainerRef.current) {
      const audioElements = audioContainerRef.current.querySelectorAll("audio");
      audioElements.forEach(el => el.muted = !soundMuted);
    }
  };

  return (
    <div className="absolute top-16 right-4 z-50 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 shadow-lg">
      <div ref={audioContainerRef} className="hidden"></div>
      <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Voice:</span>
      
      <button 
        onClick={toggleMic} 
        className={`px-3 py-1 rounded-xl text-xs font-black transition ${micMuted ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
      >
        {micMuted ? '🎤 Muted' : '🎤 Mic On'}
      </button>

      <button 
        onClick={toggleSound} 
        className={`px-3 py-1 rounded-xl text-xs font-black transition ${soundMuted ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
      >
        {soundMuted ? '🔊 Deaf' : '🔊 Sound On'}
      </button>
    </div>
  );
}
