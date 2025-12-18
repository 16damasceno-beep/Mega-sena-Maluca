
import React from 'react';

interface GameContainerProps {
  selectedNumbers: number[];
  toggleNumber: (num: number) => void;
  isDrawing: boolean;
}

export const GameContainer: React.FC<GameContainerProps> = ({ 
  selectedNumbers, 
  toggleNumber, 
  isDrawing 
}) => {
  const numbers = Array.from({ length: 60 }, (_, i) => i + 1);

  return (
    <div className="glass p-6 md:p-8 rounded-[40px] shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bungee text-green-400">Escolha seu Destino</h2>
          <p className="text-slate-400">Selecione exatamente 6 números.</p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-bungee text-yellow-400">
            {selectedNumbers.length}<span className="text-slate-600 text-xl">/6</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 md:gap-3">
        {numbers.map((num) => {
          const isSelected = selectedNumbers.includes(num);
          return (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              disabled={isDrawing || (!isSelected && selectedNumbers.length >= 6)}
              className={`
                aspect-square rounded-xl md:rounded-2xl flex items-center justify-center text-lg font-bold transition-all duration-200
                ${isSelected 
                  ? 'bg-gradient-to-br from-green-400 to-green-600 text-black scale-110 shadow-lg shadow-green-500/40 z-10' 
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                }
                ${isDrawing ? 'opacity-50 cursor-not-allowed' : 'active:scale-90'}
                ${!isSelected && selectedNumbers.length >= 6 ? 'opacity-20 grayscale' : ''}
              `}
            >
              {num.toString().padStart(2, '0')}
            </button>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 flex items-center gap-4">
        <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center text-yellow-400 animate-pulse">
           💡
        </div>
        <p className="text-sm text-slate-400">
          <strong>Dica do Maluco:</strong> O sistema odeia padrões. Tente escolher números que você sonhou depois de comer pizza amanhecida.
        </p>
      </div>
    </div>
  );
};
