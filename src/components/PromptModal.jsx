import React, { useState, useEffect, useRef } from 'react';
import { X, Pencil, AlertCircle } from 'lucide-react';

const PromptModal = ({
  isOpen,
  title = 'Renomear Período',
  label = 'Nome do Período',
  placeholder = 'Ex: Ensino Médio',
  initialValue = '',
  icon: Icon = Pencil,
  onConfirm,
  onClose,
  validator
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Por favor, informe um nome.');
      return;
    }
    if (validator) {
      const valError = validator(trimmed);
      if (valError) {
        setError(valError);
        return;
      }
    }
    onConfirm(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-black text-slate-800 tracking-tight">
              {title}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            {label && (
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {label}
              </label>
            )}
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => {
                setValue(e.target.value);
                setError('');
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') onClose();
              }}
              placeholder={placeholder}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-bold transition-all"
            />
            {error && (
              <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xs hover:shadow transition-all cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptModal;
