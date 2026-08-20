import React, { useState } from "react";

const rulesData = {
  en: {
    title: "📖 Game Rule Book",
    games: [
      { name: "Close Master", desc: "UNO style card dropping. Match suit or rank, drop cards close to zero, and call Show when ready!" },
      { name: "Cards Show", desc: "13 Unique cards challenge. Arrange and show your best combinations to beat opponents." },
      { name: "Set Show", desc: "3x3 and 1x4 sets with secret bonus points. Build valid sets to win the round." }
    ]
  },
  te: {
    title: "📖 ఆట నిబంధనలు (Rule Book)",
    games: [
      { name: "క్లోజ్ మాస్టర్", desc: "యూనో స్టెయిల్ గేమ్. ఒకే సూట్ లేదా నంబర్ కార్డ్ వేయాలి. తక్కువ పాయింట్లు ఉన్నప్పుడు 'షో' అనాలి." },
      { name: "కార్డ్స్ షో", desc: "13 ప్రత్యేక కార్డ్స్ ఛాలెంజ్. మీ ఉత్తమ కాంబినేషన్లతో ప్రత్యర్థులను ఓడించండి." },
      { name: "సెట్ షో", desc: "3x3 మరియు 1x4 సెట్స్‌తో సీక్రెట్ బోనస్ పాయింట్లు సాధించి గెలవండి." }
    ]
  },
  hi: {
    title: "📖 गेम नियम पुस्तक (Rule Book)",
    games: [
      { name: "क्लोज मास्टर", desc: "यूएनओ स्टाइल गेम। सूट या रैंक मिलाएं, अपने कार्ड्स कम करें और शो कहें!" },
      { name: "कार्ड्स शो", desc: "13 यूनिक कार्ड्स चैलेंज। अपने सबसे अच्छे कॉम्बिनेशन बनाएं।" },
      { name: "सेट शो", desc: "3x3 और 1x4 सेट के साथ सीक्रेट बोनस अंक प्राप्त करें।" }
    ]
  },
  ta: {
    title: "📖 விளையாட்டு விதிகள் (Rule Book)",
    games: [
      { name: "க்ளோஸ் மாஸ்டர்", desc: "யூனோ ஸ்டைல் விளையாட்டு. கார்டுகளைப் பொருத்தி, புள்ளிகளைக் குறைத்து ஷோ சொல்லுங்கள்!" },
      { name: "கார்ட்ஸ் ஷோ", desc: "13 தனித்துவமான கார்டுகள் சவால். உங்கள் சிறந்த கலவையை உருவாக்கவும்." },
      { name: "செட் ஷோ", desc: "3x3 மற்றும் 1x4 செட்களுடன் ரகசிய போனஸ் புள்ளிகளைப் பெறுங்கள்." }
    ]
  },
  kn: {
    title: "📖 ಆಟದ ನಿಯಮಗಳು (Rule Book)",
    games: [
      { name: "ಕ್ಲೋಸ್ ಮಾಸ್ಟರ್", desc: "ಯೂನೋ ಶೈಲಿಯ ಆಟ. ಸೂಟ್ ಅಥವಾ ರಾಂಕ್ ಹೊಂದಿಸಿ, ಕಾರ್ಡ್‌ಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಿ ಶೋ ಕೂಗಿ!" },
      { name: "ಕಾರ್ಡ್ಸ್ ಶೋ", desc: "13 ವಿಶಿಷ್ಟ ಕಾರ್ಡ್‌ಗಳ ಸವಾಲು. ನಿಮ್ಮ ಉತ್ತಮ ಜೋಡಿಗಳನ್ನು ಪ್ರದರ್ಶಿಸಿ." },
      { name: "ಸೆಟ್ ಶೋ", desc: "3x3 ಮತ್ತು 1x4 ಸೆಟ್‌ಗಳೊಂದಿಗೆ ರಹಸ್ಯ ಬೋನಸ್ ಅಂಕಗಳನ್ನು ಪಡೆಯಿರಿ." }
    ]
  }
};

export default function RuleBookModal({ isOpen, onClose }) {
  const [lang, setLang] = useState("te"); // Default Telugu rakhaam!

  if (!isOpen) return null;

  const currentRules = rulesData[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-gray-950 border-2 border-yellow-400/40 w-full max-w-lg rounded-3xl p-6 shadow-[0_0_50px_rgba(250,204,21,0.2)] flex flex-col gap-6 relative animate-scale-in">
        
        {/* Header & Close Button */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <h2 className="text-2xl font-black text-yellow-400 uppercase italic tracking-wider">{currentRules.title}</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white font-black flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Language Switcher Buttons */}
        <div className="flex flex-wrap gap-2 justify-center bg-black/60 p-2 rounded-2xl border border-white/10">
          {[
            { code: "te", label: "తెలుగు" },
            { code: "en", label: "English" },
            { code: "hi", label: "हिंदी" },
            { code: "ta", label: "தமிழ்" },
            { code: "kn", label: "ಕನ್ನಡ" }
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                lang === l.code 
                  ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-105" 
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Rules Content */}
        <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
          {currentRules.games.map((g, index) => (
            <div key={index} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-1 hover:border-yellow-400/50 transition">
              <h3 className="text-yellow-400 font-black text-lg uppercase italic">{g.name}</h3>
              <p className="text-gray-300 text-xs sm:text-sm font-medium leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <button 
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black uppercase rounded-xl tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition"
        >
          Got It, Let's Play! 🚀
        </button>

      </div>
    </div>
  );
}