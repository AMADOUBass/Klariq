import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as 'en' | 'fr')) {
    locale = routing.defaultLocale;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = (await import(`../../messages/${locale}.json`)) as any;

  return {
    locale,
    messages: messages.default,
  };
});
