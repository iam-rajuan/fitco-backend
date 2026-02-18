import openai from '../../config/openai';
import config from '../../config';
import ChatModel, { ChatDocument } from './model';
import UserModel from '../user/model';
import * as subscriptionService from '../subscription/service';

interface ChatResponse {
  answer: string;
  record: ChatDocument;
}

export const sendMessage = async (userId: string, prompt: string): Promise<ChatResponse> => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OpenAI API key missing');
    (error as any).statusCode = 500;
    throw error;
  }
  const user = await UserModel.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }

  const activeSubscription = await subscriptionService.getUserActiveSubscription(userId);
  const isPremium = Boolean(activeSubscription);
  await UserModel.findByIdAndUpdate(userId, { subscriptionStatus: isPremium ? 'premium' : 'free' });

  if (!isPremium) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const messagesToday = await ChatModel.countDocuments({ user: userId, createdAt: { $gte: startOfDay } });
    if (messagesToday >= config.chat.freeLimit) {
      const error = new Error('Daily chat limit reached. Upgrade to premium for unlimited access.');
      (error as any).statusCode = 403;
      throw error;
    }
  }

  const systemPrompt = `You are Creedtng, an AI fitness coach. Personalize guidance using this profile: Name: ${user.name}. Height: ${user.height ?? 'N/A'}. Weight: ${user.weight ?? 'N/A'}. Goals: ${user.goals ?? 'N/A'}. Subscription: ${isPremium ? 'Premium' : 'Free'}. Provide actionable, safe fitness and nutrition advice.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
  });

  const answer = completion.choices[0].message?.content || 'I am unable to respond right now.';

  const record = await ChatModel.create({
    user: userId,
    prompt,
    response: answer,
    metadata: {
      subscription: isPremium ? 'premium' : 'free'
    }
  });

  return { answer, record };
};

export const getHistory = (userId: string): Promise<ChatDocument[]> => {
  return ChatModel.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
};