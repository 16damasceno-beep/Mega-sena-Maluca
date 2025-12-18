
import React, { useState, useRef, useEffect } from 'react';
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
    try {
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
    } catch (err) {
      console.error("Erro ao tocar áudio:", err);
    }
  };

  const handleDraw = async () => {
    if (gameState.selectedNumbers.length !== 6) return;

    setGameState(prev => ({ ...prev, isDrawing: true, drawnNumbers: [], hasWon: false }));
    setAiMessage("Consultando as estrelas do fracasso...");
    setWinnerImageUrl(null);
    setWinnerAudio(null);

    const userNums = [...gameState.selectedNumbers].sort((a, b) => a - b);
    const finalDraw: number[] = [];
    
    // Probabilidades baseadas no nível de caos
    const probabilities = {
      'Tranquilo': 0.85,    // 15% chance
      'Malucão': 0.95,     // 5% chance
      'Apocalíptico': 0.999 // 0.1% chance (quase impossível)
    };
    
    const willWin = Math.random() > probabilities[gameState.chaosLevel]; 

    if (willWin) {
      finalDraw.push(...userNums);
    } else {
      const pool = Array.from({ length: 60 }, (_, i) => i + 1);
      const wrongNumPool = pool.filter(n => !userNums.includes(n));
      const pickedFromUser = userNums.slice(0, 5); // Pega 5 do usuário pra dar esperança
      const oneWrong = wrongNumPool[Math.floor(Math.random() * wrongNumPool.length)];
      finalDraw.push(...pickedFromUser, oneWrong);
    }

    finalDraw.sort((a, b) => a - b);

    // Animação das bolas
    for (let i = 1; i <= 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
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
    try {
      const newImg = await editWinnerImage(winnerImageUrl, editPrompt);
      if (newImg) {
        setWinnerImageUrl(newImg);
        setEditPrompt("");
      }
    } catch (err) {
      console.error("Erro ao editar imagem:", err);
    } finally {
      setIsEditing(false);
    }
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 selection:bg-yellow-400 selection:text-black overflow-x-hidden">
      {/* Modal de Vitória */}
      {gameState.hasWon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-700 p-4 overflow-y-auto">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({length: 40}).map((_, i) => (
              <div key={i} className="absolute text-5xl animate-bounce" style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.4
              }}>💸</div>
            ))}
          </div>

          <div className="relative z-10 max-w-3xl w-full p-8 text-center bg-gradient-to-b from-transparent via-green-900/10 to-transparent rounded-[50px] my-auto">
            <h2 className="text-4xl md:text-8xl font-bungee text-yellow-400 mb-4 drop-shadow-[0_0_30px_rgba(250,204,21,1)] animate-pulse">
              VOCÊ É MALUCO!
            </h2>
            
            <div className="relative group mx-auto w-64 h-64 md:w-80 md:h-80 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 rounded-full animate-spin-slow blur-3xl opacity-60"></div>
              {winnerImageUrl ? (
                <div className="relative z-10 w-full h-full p-2 bg-white rounded-3xl shadow-[0_0_60px_rgba(255,255,255,0.2)] transition-all duration-500 hover:rotate-2">
                  <img 
                    src={winnerImageUrl} 
                    className={`w-full h-full object-cover rounded-2xl animate-float ${isEditing ? 'opacity-50 grayscale contrast-125' : ''}`}
                    alt="Prêmio"
                  />
                  {isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="bg-black/50 p-4 rounded-full">
                        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                  )}
                  <div className="absolute -top-4 -right-4 bg-red-600 text-white font-bungee px-4 py-2 rounded-full text-xs shadow-xl animate-bounce">
                    BILIONÁRIO!!!
                  </div>
                </div>
              ) : (
                <div className="relative z-10 w-full h-full bg-slate-800 rounded-3xl flex flex-col items-center justify-center animate-pulse border-4 border-dashed border-slate-600">
                  <span className="font-bungee text-slate-500 text-2xl">PROCESSANDO</span>
                  <span className="font-bungee text-slate-500 text-sm">SEU AZAR SORTUDO...</span>
                </div>
              )}
            </div>

            {/* Interface de Edição Nano Banana */}
            {winnerImageUrl && !isEditing && (
              <div className="mb-6 max-w-md mx-auto animate-in slide-in-from-bottom duration-500">
                 <p className="text-[10px] font-bungee text-yellow-500 mb-2 tracking-widest uppercase">Mude a realidade da foto:</p>
                 <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                   <input 
                    type="text" 
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Ex: Adicionar óculos de sol"
                    className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && handleEditImage()}
                   />
                   <button 
                    onClick={handleEditImage}
                    className="bg-yellow-400 text-black font-bungee px-6 py-2 rounded-xl text-xs hover:bg-yellow-300 transition-transform active:scale-95"
                   >
                     EDITAR
                   </button>
                 </div>
              </div>
            )}

            <div className="mb-8">
              <p className="text-xl md:text-3xl font-bungee text-pink-500 animate-pulse uppercase leading-none mb-4">
                "Vem meu querido, vou gastar todo seu dinheiro!"
              </p>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 max-w-lg mx-auto">
                <p className="text-slate-300 font-bold text-sm italic">
                  "{aiMessage}"
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6 items-center">
              <button 
                onClick={resetGame}
                className="group relative px-16 py-6 bg-green-500 hover:bg-green-400 text-black rounded-full font-bungee text-3xl shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all hover:scale-110 active:scale-95 animate-bounce"
              >
                <span className="relative z-10">INICIAR NOVO JOGO</span>
                <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </button>

              {winnerAudio && (
                <button 
                  onClick={() => playWinnerAudio(winnerAudio)}
                  className="px-6 py-2 bg-slate-800/80 text-white rounded-full font-bold hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-600 text-xs"
                >
                  🔊 OUVIR ELA FALAR DE NOVO
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-5xl md:text-8xl font-bungee text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-300 to-pink-500 mb-2 drop-shadow-sm select-none">
          MEGA SENA MALUCA
        </h1>
        <p className="text-slate-500 text-lg font-medium">Onde a probabilidade é sua maior inimiga.</p>
        
        {/* Seletor de Nível de Caos */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <span className="text-[10px] font-bungee text-slate-600 tracking-[0.3em]">ESCOLHA SEU NÍVEL DE SOFRIMENTO</span>
          <div className="flex justify-center gap-3">
            {(['Tranquilo', 'Malucão', 'Apocalíptico'] as ChaosLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setGameState(prev => ({ ...prev, chaosLevel: lvl }))}
                disabled={gameState.isDrawing}
                className={`px-5 py-2 rounded-2xl font-bungee text-[10px] transition-all border-2 ${
                  gameState.chaosLevel === lvl 
                  ? 'bg-yellow-400 border-yellow-400 text-black scale-110 shadow-[0_0_20px_rgba(250,204,21,0.4)]' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
        <div className="lg:col-span-8">
          <GameContainer 
            selectedNumbers={gameState.selectedNumbers}
            toggleNumber={toggleNumber}
            isDrawing={gameState.isDrawing}
          />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="glass p-6 rounded-[40px] shadow-2xl relative overflow-hidden border-2 border-white/5">
            <h2 className="text-2xl font-bungee text-yellow-400 mb-4 flex justify-between items-center">
              Bilhete
              <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-slate-400">PAGO</span>
            </h2>
            <div className="flex flex-wrap gap-2 mb-6 min-h-[120px] items-center justify-center bg-black/30 rounded-3xl p-4 border border-white/5">
              {gameState.selectedNumbers.length === 0 && (
                <div className="text-center opacity-30">
                   <div className="text-4xl mb-2">🎰</div>
                   <span className="text-xs font-bold uppercase">Aguardando escolhas...</span>
                </div>
              )}
              {gameState.selectedNumbers.sort((a,b)=>a-b).map(num => (
                <div key={num} className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center font-bold text-lg shadow-lg border border-white/10 animate-in zoom-in duration-300">
                  {num}
                </div>
              ))}
            </div>

            <button
              onClick={handleDraw}
              disabled={gameState.selectedNumbers.length !== 6 || gameState.isDrawing}
              className={`w-full py-5 rounded-3xl font-bungee text-2xl transition-all shadow-2xl ${
                gameState.selectedNumbers.length === 6 && !gameState.isDrawing
                ? "bg-yellow-400 text-black hover:bg-yellow-300 hover:-translate-y-1 active:scale-95 shadow-[0_15px_30px_rgba(250,204,21,0.2)]"
                : "bg-slate-800 text-slate-600 cursor-not-allowed"
              }`}
            >
              {gameState.isDrawing ? "SORTEANDO..." : "COMPRAR BOLETO"}
            </button>

            {gameState.drawnNumbers.length > 0 && (
              <div className="mt-10 animate-in slide-in-from-bottom duration-500">
                <h3 className="text-xs font-bungee text-pink-500 mb-4 text-center tracking-widest">RESULTADO OFICIAL DO GLOBO:</h3>
                <div className="flex justify-center gap-3 flex-wrap">
                  {gameState.drawnNumbers.map((num, i) => (
                    <div 
                      key={i} 
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-xl border-2 ${
                        gameState.selectedNumbers.includes(num) ? 'bg-green-500 border-white text-black animate-ping' : 'bg-white border-slate-200 text-black'
                      }`}
                      style={{ animationIterationCount: 1, animationDuration: '0.8s' }}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {aiMessage && !gameState.hasWon && (
            <div className="p-8 rounded-[40px] shadow-2xl animate-in zoom-in duration-300 border-4 bg-indigo-950/80 border-indigo-500/30 relative overflow-hidden backdrop-blur-md">
               <div className="absolute -top-4 -right-4 text-6xl opacity-10 rotate-12">🤖</div>
               <h4 className="text-sm font-bungee mb-3 flex items-center gap-2 text-yellow-400 tracking-widest">MESTRE DO CAOS DIZ:</h4>
               <p className="text-xl font-bold leading-tight text-white italic drop-shadow-md">"{aiMessage}"</p>
               {!gameState.isDrawing && (
                 <button onClick={resetGame} className="mt-6 text-[10px] font-bungee text-white/40 hover:text-white transition-colors underline decoration-dotted">RESETAR MINHA DIGNIDADE</button>
               )}
            </div>
          )}
        </aside>
      </main>

      <footer className="text-center text-slate-700 text-[10px] font-bungee tracking-[0.5em] pb-10 uppercase">
        <p>Aposta proibida para menores de 18 neurônios.</p>
      </footer>
    </div>
  );
};

export default App;
