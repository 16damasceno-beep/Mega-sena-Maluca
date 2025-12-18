
import React, { useState, useRef } from 'react';
import { GameContainer } from './components/GameContainer';
import { 
  getChaosCommentary, 
  generateWinnerImage, 
  generateWinnerAudio, 
  decodeBase64Audio, 
  decodeAudioData,
  editWinnerImage
} from './geminiService';
import { GameState, ChaosLevel } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    selectedNumbers: [],
    drawnNumbers: [],
    isDrawing: false,
    resultMessage: "Escolha 6 números se tiver coragem...",
    hasWon: false,
    chaosLevel: 'Malucão',
  });

  const [aiMessage, setAiMessage] = useState<string>("");
  const [winnerImageUrl, setWinnerImageUrl] = useState<string | null>(null);
  const [winnerAudio, setWinnerAudio] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const toggleNumber = (num: number) => {
    if (gameState.isDrawing) return;
    setGameState(prev => {
      const isSelected = prev.selectedNumbers.includes(num);
      if (isSelected) return { ...prev, selectedNumbers: prev.selectedNumbers.filter(n => n !== num) };
      if (prev.selectedNumbers.length < 6) return { ...prev, selectedNumbers: [...prev.selectedNumbers, num] };
      return prev;
    });
  };

  const playWinnerAudio = async (base64: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    
    const bytes = decodeBase64Audio(base64);
    const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  };

  const handleDraw = async () => {
    if (gameState.selectedNumbers.length !== 6) return;

    setGameState(prev => ({ ...prev, isDrawing: true, drawnNumbers: [], hasWon: false }));
    setAiMessage("Calculando o azar...");
    setWinnerImageUrl(null);
    setWinnerAudio(null);

    const userNums = [...gameState.selectedNumbers].sort((a, b) => a - b);
    const finalDraw: number[] = [];
    
    // Win Probability based on Chaos Level
    const probabilities = {
      'Tranquilo': 0.80, // 20% win chance
      'Malucão': 0.90,  // 10% win chance
      'Apocalíptico': 0.99, // 1% win chance
    };
    const willWin = Math.random() > probabilities[gameState.chaosLevel]; 

    if (willWin) {
      finalDraw.push(...userNums);
    } else {
      const pool = Array.from({ length: 60 }, (_, i) => i + 1);
      const wrongNumPool = pool.filter(n => !userNums.includes(n));
      const pickedFromUser = userNums.slice(0, 5);
      const oneWrong = wrongNumPool[Math.floor(Math.random() * wrongNumPool.length)];
      finalDraw.push(...pickedFromUser, oneWrong);
    }

    finalDraw.sort((a, b) => a - b);

    for (let i = 1; i <= 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setGameState(prev => ({ ...prev, drawnNumbers: finalDraw.slice(0, i) }));
    }

    const won = userNums.every(n => finalDraw.includes(n));
    const comment = await getChaosCommentary(won ? 'win' : 'lose', userNums, gameState.chaosLevel);
    
    if (won) {
      const [img, audio] = await Promise.all([
        generateWinnerImage(),
        generateWinnerAudio()
      ]);
      setWinnerImageUrl(img);
      setWinnerAudio(audio);
      if (audio) playWinnerAudio(audio);
    }

    setAiMessage(comment);
    setGameState(prev => ({ 
      ...prev, 
      isDrawing: false, 
      hasWon: won,
      resultMessage: won ? "VOCÊ É MALUCO!" : "Tente novamente, fracassado."
    }));
  };

  const handleEditImage = async () => {
    if (!winnerImageUrl || !editPrompt || isEditing) return;
    setIsEditing(true);
    const newImg = await editWinnerImage(winnerImageUrl, editPrompt);
    if (newImg) {
      setWinnerImageUrl(newImg);
      setEditPrompt("");
    }
    setIsEditing(false);
  };

  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      selectedNumbers: [],
      drawnNumbers: [],
      isDrawing: false,
      resultMessage: "Escolha 6 números se tiver coragem...",
      hasWon: false,
    }));
    setAiMessage("");
    setWinnerImageUrl(null);
    setWinnerAudio(null);
    setEditPrompt("");
  };

  const changeChaosLevel = (level: ChaosLevel) => {
    if (gameState.isDrawing) return;
    setGameState(prev => ({ ...prev, chaosLevel: level }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 selection:bg-yellow-400 selection:text-black overflow-x-hidden">
      {/* Winner Modal */}
      {gameState.hasWon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-700 p-4 overflow-y-auto">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({length: 30}).map((_, i) => (
              <div key={i} className="absolute text-5xl animate-bounce" style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.4
              }}>💸</div>
            ))}
          </div>

          <div className="relative z-10 max-w-3xl w-full p-8 text-center bg-gradient-to-b from-transparent via-purple-900/20 to-transparent rounded-[50px] my-auto">
            <h2 className="text-4xl md:text-7xl font-bungee text-yellow-400 mb-6 drop-shadow-[0_0_25px_rgba(250,204,21,1)] animate-pulse">
              VOCÊ É MALUCO!
            </h2>
            
            <div className="relative group mx-auto w-64 h-64 md:w-80 md:h-80 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 rounded-full animate-spin-slow blur-3xl opacity-60"></div>
              {winnerImageUrl ? (
                <div className="relative z-10 w-full h-full p-2 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-all duration-500">
                  <img 
                    src={winnerImageUrl} 
                    className={`w-full h-full object-cover rounded-2xl animate-float ${isEditing ? 'opacity-50 grayscale' : ''}`}
                    alt="Prêmio Maluco"
                  />
                  {isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <div className="absolute -top-4 -right-4 bg-red-600 text-white font-bungee px-4 py-2 rounded-full text-xs shadow-xl animate-bounce">
                    MUITO DINHEIRO!!!
                  </div>
                </div>
              ) : (
                <div className="relative z-10 w-full h-full bg-slate-800 rounded-3xl flex flex-col items-center justify-center animate-pulse border-4 border-dashed border-slate-600">
                  <span className="font-bungee text-slate-500 text-2xl">GERANDO</span>
                  <span className="font-bungee text-slate-500 text-sm">A SUA PERDIÇÃO...</span>
                </div>
              )}
            </div>

            {/* Image Editing UI */}
            {winnerImageUrl && !isEditing && (
              <div className="mb-8 max-w-md mx-auto">
                 <p className="text-xs font-bungee text-slate-500 mb-2">QUER MUDAR A FOTO? DIGITA AÍ (EX: "COLOCA UM ÓCULOS ESCUROS")</p>
                 <div className="flex gap-2">
                   <input 
                    type="text" 
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Adicionar um filtro retrô..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                   />
                   <button 
                    onClick={handleEditImage}
                    className="bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-yellow-300 transition-colors"
                   >
                     EDITAR
                   </button>
                 </div>
              </div>
            )}

            <div className="mb-8 space-y-2">
              <p className="text-xl md:text-3xl font-bungee text-pink-500 animate-pulse uppercase tracking-tighter">
                "Vem meu querido, vou gastar todo seu dinheiro!"
              </p>
              <p className="text-slate-400 font-bold italic">
                {aiMessage}
              </p>
            </div>

            <div className="flex flex-col gap-6 items-center">
              <button 
                onClick={resetGame}
                className="group relative px-12 py-6 bg-green-500 hover:bg-green-400 text-black rounded-full font-bungee text-3xl shadow-[0_0_30px_rgba(34,197,94,0.6)] transition-all hover:scale-110 active:scale-95"
              >
                <span className="relative z-10">INICIAR NOVO JOGO</span>
                <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </button>

              {winnerAudio && (
                <button 
                  onClick={() => playWinnerAudio(winnerAudio)}
                  className="px-6 py-2 bg-slate-800/80 text-white rounded-full font-bold hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-600"
                >
                  🔊 OUVIR ELA FALAR DE NOVO
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-bungee text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-300 to-pink-500 mb-4 drop-shadow-sm">
          MEGA SENA MALUCA
        </h1>
        <p className="text-slate-400 text-lg">Onde a lógica morre e o azar é garantido.</p>
        
        {/* Chaos Level Selector */}
        <div className="mt-6 flex justify-center gap-2">
          {(['Tranquilo', 'Malucão', 'Apocalíptico'] as ChaosLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => changeChaosLevel(lvl)}
              disabled={gameState.isDrawing}
              className={`px-4 py-2 rounded-full font-bungee text-xs transition-all border-2 ${
                gameState.chaosLevel === lvl 
                ? 'bg-yellow-400 border-yellow-400 text-black scale-110 shadow-lg' 
                : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <GameContainer 
            selectedNumbers={gameState.selectedNumbers}
            toggleNumber={toggleNumber}
            isDrawing={gameState.isDrawing}
          />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="glass p-6 rounded-3xl shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-bungee text-yellow-400 mb-4">Seu Bilhete</h2>
            <div className="flex flex-wrap gap-2 mb-6 min-h-[100px] items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-4">
              {gameState.selectedNumbers.length === 0 && (
                <span className="text-slate-500 italic">Nenhum número selecionado...</span>
              )}
              {gameState.selectedNumbers.sort((a,b)=>a-b).map(num => (
                <div key={num} className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center font-bold text-xl shadow-lg border border-white/20">
                  {num}
                </div>
              ))}
            </div>

            <button
              onClick={handleDraw}
              disabled={gameState.selectedNumbers.length !== 6 || gameState.isDrawing}
              className={`w-full py-4 rounded-2xl font-bungee text-xl transition-all shadow-xl ${
                gameState.selectedNumbers.length === 6 && !gameState.isDrawing
                ? "bg-yellow-400 text-black hover:bg-yellow-300 active:scale-95 shadow-[0_10px_20px_rgba(250,204,21,0.3)]"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              {gameState.isDrawing ? "SORTEANDO..." : "APOSTAR TUDO!"}
            </button>

            {gameState.drawnNumbers.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-bungee text-pink-500 mb-3 text-center">Resultado do Globo:</h3>
                <div className="flex justify-center gap-2 flex-wrap">
                  {gameState.drawnNumbers.map((num, i) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold shadow-white/50 shadow-sm animate-bounce"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {aiMessage && !gameState.hasWon && (
            <div className="p-6 rounded-3xl shadow-2xl animate-in zoom-in duration-300 border-4 bg-indigo-900 border-indigo-700 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 opacity-20">🤖</div>
               <h4 className="text-lg font-bungee mb-2 flex items-center gap-2 text-yellow-400">🤖 Mestre do Caos:</h4>
               <p className="text-xl font-bold leading-tight text-indigo-100 italic">"{aiMessage}"</p>
               {!gameState.isDrawing && (
                 <button onClick={resetGame} className="mt-4 text-xs underline opacity-50 hover:opacity-100 transition-opacity">Resetar minha vergonha</button>
               )}
            </div>
          )}
        </aside>
      </main>

      <footer className="mt-16 text-center text-slate-600 text-sm pb-12">
        <p>© 2024 Mega Sena Maluca - Onde você perde até o que não tem.</p>
      </footer>
    </div>
  );
};

export default App;
