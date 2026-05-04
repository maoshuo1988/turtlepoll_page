/**
 * 文件说明：Pet Chat，宠物系统相关共享组件。
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles } from 'lucide-react';
import { useRequestPetStaminaConsume } from '@/hook/usePetRequest';
import type { PetInfo } from '@/data/mock_data';
import { heroNews, mockNews, petDialogues } from '@/data/mock_data';
import { getAuthToken } from '@/utils/authStorage';
import { getPetApiErrorMessage } from '@/utils/petHelpers';

interface ChatMessage {
  id: string;
  role: 'user' | 'pet';
  text: string;
}

interface PetChatProps {
  pet: PetInfo;
  onClose: () => void;
  /** When true the chat fills its parent height and the X button shows "回到大厅" */
  fullScreen?: boolean;
  stamina?: number;
  onStaminaChange?: (newStamina: number) => void;
}

const allNews = [heroNews, ...mockNews];

function generateAnalysis(query: string): string {
  const q = query.toLowerCase();
  const matched = allNews.find((n) => {
    const title = n.title.toLowerCase();
    // check if any 2+ char segment of the query appears in the title
    return q.split('').some((_, i) => {
      const seg = q.slice(i, i + 2);
      return seg.length >= 2 && title.includes(seg);
    });
  });

  if (!matched) {
    const pool = petDialogues.chat;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const total = matched.votes.A + matched.votes.B;
  const pctA = ((matched.votes.A / total) * 100).toFixed(1);
  const pctB = ((matched.votes.B / total) * 100).toFixed(1);
  const recommend = matched.votes.A >= matched.votes.B ? matched.optionA : matched.optionB;
  const recommendPct = matched.votes.A >= matched.votes.B ? pctA : pctB;

  const templates = [
    `关于「${matched.title.slice(0, 15)}...」，龟仙人帮你分析了一下：\n\n当前共 ${total.toLocaleString()} 人参与投票：\n• 「${matched.optionA}」${pctA}%，赔率 ${matched.oddsA}x\n• 「${matched.optionB}」${pctB}%，赔率 ${matched.oddsB}x\n\n龟仙人觉得「${recommend}」(${recommendPct}%) 的可能性更大，不过投资有风险，下注需谨慎哦~`,
    `龟仙人查了一下数据：「${matched.optionA}」目前有 ${pctA}% 的人支持（赔率${matched.oddsA}x），「${matched.optionB}」有 ${pctB}% 的人支持（赔率${matched.oddsB}x）。综合来看，「${recommend}」赢面更大！`,
    `这个事件很火呢！${total.toLocaleString()} 人已经投票了。「${matched.optionA}」支持率 ${pctA}%，「${matched.optionB}」支持率 ${pctB}%。龟仙人建议关注「${recommend}」，但记得分散下注~`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

export const PetChat: React.FC<PetChatProps> = ({ pet, onClose, fullScreen, stamina, onStaminaChange }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'pet', text: `主人好呀！我是${pet.name}~\n想了解哪个事件的概率？直接问我就好！` },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const consumeMutation = useRequestPetStaminaConsume();
  const isAuthenticated = Boolean(getAuthToken());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || typing) return;

    // Stamina check: need 2 stamina per message
    if (stamina !== undefined && stamina < 2) {
      const warnMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: 'pet',
        text: '呜...我太累了，体力不足了 😵\n去「抽奖&商店」买苹果给我补充体力吧~',
      };
      setMessages((prev) => [...prev, warnMsg]);
      return;
    }

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Consume 2 stamina
    if (stamina !== undefined) {
      if (isAuthenticated) {
        try {
          await consumeMutation.mutateAsync({ amount: 2 });
          if (onStaminaChange) {
            onStaminaChange(Math.max(0, stamina - 2));
          }
        } catch (error) {
          const warnMsg: ChatMessage = {
            id: `sys-${Date.now()}`,
            role: 'pet',
            text: getPetApiErrorMessage(error, '体力扣减失败，请稍后再试。'),
          };
          setMessages((prev) => [...prev, warnMsg]);
          setTyping(false);
          return;
        }
      } else if (onStaminaChange) {
        onStaminaChange(Math.max(0, stamina - 2));
      }
    }

    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      const reply = generateAnalysis(text);
      const petMsg: ChatMessage = { id: `p-${Date.now()}`, role: 'pet', text: reply };
      setMessages((prev) => [...prev, petMsg]);
      setTyping(false);
    }, delay);
  }, [consumeMutation, input, isAuthenticated, onStaminaChange, stamina, typing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`legacy-pet-chat flex flex-col ${fullScreen ? 'h-full' : 'h-[360px]'}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-emerald-100 dark:border-emerald-900/30 shrink-0">
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 grid place-items-center text-base">
          {pet.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-slate-700 dark:text-rdark-text">{pet.name}</div>
          <div className="text-[9px] text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5">
            <Sparkles size={8} /> 事件分析模式
          </div>
        </div>
        <button
          onClick={onClose}
          className={`rounded-md hover:bg-slate-100 dark:hover:bg-rdark-hover cursor-pointer border-0 bg-transparent text-slate-400 dark:text-rdark-text2 transition-colors ${
            fullScreen ? 'flex items-center gap-1 px-2 py-1 text-[10px] font-medium hover:text-emerald-600 dark:hover:text-emerald-400' : 'p-1'
          }`}
        >
          {fullScreen ? (<><X size={12} /><span>回到大厅</span></>) : <X size={14} />}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'pet' && (
                <span className="text-sm shrink-0 mr-1.5 mt-0.5">{pet.avatar}</span>
              )}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 dark:bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-rdark-input text-slate-700 dark:text-rdark-text rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {typing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <span className="text-sm shrink-0 mr-1.5 mt-0.5">{pet.avatar}</span>
            <div className="bg-slate-100 dark:bg-rdark-input rounded-xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              />
              <span className="text-[10px] text-slate-400 dark:text-rdark-text2 ml-1">分析中...</span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 pb-3 pt-2 border-t border-slate-100 dark:border-rdark-border">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-rdark-input rounded-lg px-3 py-2 border border-slate-200 dark:border-rdark-border focus-within:border-emerald-300 dark:focus-within:border-emerald-700 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="问我任何预测事件..."
            className="flex-1 bg-transparent border-0 outline-none text-[11px] text-slate-700 dark:text-rdark-text placeholder:text-slate-400 dark:placeholder:text-rdark-text2"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || typing}
            className={`p-1 rounded-md border-0 cursor-pointer transition-colors ${
              input.trim() && !typing
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-slate-200 dark:bg-rdark-border text-slate-400 dark:text-rdark-text2 cursor-not-allowed'
            }`}
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
