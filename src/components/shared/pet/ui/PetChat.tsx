/**
 * 文件说明：Pet Chat，宠物系统相关共享组件。
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Apple, X, Send, Sparkles } from 'lucide-react';
import {
  useRequestAiChat,
  useRequestAiStamina,
  useRequestAiStaminaApple,
} from '@/hooks/useAiRequests';
import type { AiPushMessage } from '@/hooks/aiTypes';
import type { PetInfo } from '@/data/mockData';
import { getAuthToken } from '@/utils/authStorage';
import { useHomeLayoutContext } from '@/layouts/context';

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
  /** 嵌入 Tab / 面板时使用更高可视高度（移动端宠物页 AI 对话） */
  embedded?: boolean;
  stamina?: number;
  onStaminaChange?: (newStamina: number) => void;
  aiPushMessages?: AiPushMessage[];
}

const MAX_CHAT_INPUT_LENGTH = 500;

function getAiChatErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('content exceeds max length')) return '这段话太长啦，先压到 500 字以内再问我。';
  if (message.includes('daily ai chat limit reached')) return '今天主动聊天次数已经用完，明天再来找小龟继续聊。';
  if (message.includes('AI_STAMINA_NOT_ENOUGH')) return '小龟睡着啦，喂它一颗苹果就能继续聊咯。';
  if (message.includes('ai chat is disabled')) return '小龟的 AI 聊天暂时没有开启，稍后再来看看。';
  if (message.includes('content is required')) return '先输入想问的问题，小龟才能开口。';
  return fallback;
}

export const PetChat: React.FC<PetChatProps> = ({ pet, onClose, fullScreen, embedded, stamina, aiPushMessages = [] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'pet', text: `主人好呀！我是${pet.name}~\n想了解哪个事件的概率？直接问我就好！` },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAuthenticated = Boolean(getAuthToken());
  const { onOpenAuth } = useHomeLayoutContext();
  const aiStaminaQuery = useRequestAiStamina();
  const aiChatMutation = useRequestAiChat();
  const aiAppleMutation = useRequestAiStaminaApple();
  const displayedPushIdsRef = useRef<Set<string>>(new Set());
  const isBusy = aiChatMutation.isLoading || aiAppleMutation.isLoading;
  const staminaLeft = aiStaminaQuery.data?.stamina ?? stamina;
  const maxStamina = aiStaminaQuery.data?.maxStamina;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBusy]);

  const appendPushMessages = useCallback((pushes: AiPushMessage[]) => {
    if (!pushes.length) return;

    const nextPushes = pushes.filter((push) => {
      const id = String(push.id);
      if (displayedPushIdsRef.current.has(id)) return false;
      displayedPushIdsRef.current.add(id);
      return true;
    });
    if (!nextPushes.length) return;

    setMessages((prev) => {
      const existed = new Set(prev.map((item) => item.id));
      const nextMessages = nextPushes
        .filter((push) => !existed.has(`push-${push.id}`))
        .map<ChatMessage>((push) => ({
          id: `push-${push.id}`,
          role: 'pet',
          text: push.content,
        }));
      return nextMessages.length ? [...prev, ...nextMessages] : prev;
    });
  }, []);

  useEffect(() => {
    appendPushMessages(aiPushMessages);
  }, [aiPushMessages, appendPushMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isBusy) return;

    if (!isAuthenticated) {
      const warnMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: 'pet',
        text: '先登录一下，小龟才能记住你们的聊天和 AI 体力。',
      };
      setMessages((prev) => [...prev, warnMsg]);
      onOpenAuth();
      return;
    }

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const result = await aiChatMutation.mutateAsync({
        content: text,
        scene: 'chat',
      });
      const reply = result.insufficientPrompt || result.message?.content || '小龟现在有点困，等会儿再来找我聊吧。';
      const suffix = result.degraded ? '\n\n（这次是临时兜底回复，没有消耗体力。）' : '';
      const petMsg: ChatMessage = {
        id: `p-${result.message?.id ?? Date.now()}`,
        role: 'pet',
        text: `${reply}${suffix}`,
      };
      setMessages((prev) => [...prev, petMsg]);
    } catch (error) {
      const petMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'pet',
        text: getAiChatErrorMessage(error, '小龟连接 AI 失败了，稍后再试一次。'),
      };
      setMessages((prev) => [...prev, petMsg]);
    }
  }, [aiChatMutation, input, isAuthenticated, isBusy, onOpenAuth]);

  const handleRecoverStamina = useCallback(async () => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    try {
      const result = await aiAppleMutation.mutateAsync({ count: 1 });
      const recovered = result.recoveredCount ?? 1;
      const cost = result.coinCost ?? result.appleCoinCost;
      const petMsg: ChatMessage = {
        id: `apple-${Date.now()}`,
        role: 'pet',
        text: `苹果补给成功，AI 体力恢复 ${recovered} 点${typeof cost === 'number' ? `，消耗 ${cost} 龟币` : ''}。`,
      };
      setMessages((prev) => [...prev, petMsg]);
    } catch (error) {
      const petMsg: ChatMessage = {
        id: `apple-err-${Date.now()}`,
        role: 'pet',
        text: getAiChatErrorMessage(error, '苹果补给失败，可能是体力已满或龟币不足。'),
      };
      setMessages((prev) => [...prev, petMsg]);
    }
  }, [aiAppleMutation, isAuthenticated, onOpenAuth]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`legacy-pet-chat flex flex-col ${
        fullScreen ? 'h-full' : embedded ? 'h-[min(62vh,520px)] min-h-[320px]' : 'h-[360px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-emerald-100 dark:border-emerald-900/30 shrink-0">
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 grid place-items-center text-base">
          {pet.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-slate-700 dark:text-rdark-text">{pet.name}</div>
          <div className="text-[9px] text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5">
            <Sparkles size={8} /> AI 聊天模式
            {typeof staminaLeft === 'number' && typeof maxStamina === 'number' ? (
              <span className="ml-1 text-slate-400 dark:text-rdark-text2">{staminaLeft}/{maxStamina}</span>
            ) : null}
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
        {aiChatMutation.isLoading && (
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
              <span className="text-[10px] text-slate-400 dark:text-rdark-text2 ml-1">思考中...</span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 pb-3 pt-2 border-t border-slate-100 dark:border-rdark-border">
        <div className="mb-2 flex items-center justify-between gap-2 text-[9px] text-slate-400 dark:text-rdark-text2">
          <span>
            {isAuthenticated
              ? aiStaminaQuery.isLoading
                ? '正在读取 AI 体力...'
                : typeof staminaLeft === 'number' && typeof maxStamina === 'number'
                  ? `AI 体力 ${staminaLeft}/${maxStamina}${typeof aiStaminaQuery.data?.dailyRemaining === 'number' ? ` · 今日剩余 ${aiStaminaQuery.data.dailyRemaining}` : ''}`
                  : 'AI 体力待同步'
              : '登录后可使用 AI 聊天'}
          </span>
          <button
            type="button"
            onClick={handleRecoverStamina}
            disabled={aiAppleMutation.isLoading}
            className="flex shrink-0 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/30"
          >
            <Apple size={10} /> 补体力
          </button>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-rdark-input rounded-lg px-3 py-2 border border-slate-200 dark:border-rdark-border focus-within:border-emerald-300 dark:focus-within:border-emerald-700 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="问我任何预测事件..."
            maxLength={MAX_CHAT_INPUT_LENGTH}
            className="flex-1 bg-transparent border-0 outline-none text-[11px] text-slate-700 dark:text-rdark-text placeholder:text-slate-400 dark:placeholder:text-rdark-text2"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isBusy}
            className={`p-1 rounded-md border-0 cursor-pointer transition-colors ${
              input.trim() && !isBusy
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
