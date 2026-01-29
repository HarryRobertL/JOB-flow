/**
 * Install Prompt Component
 * 
 * Displays an unobtrusive banner prompting users to install the PWA.
 * Respects user choice and dismisses once installed or dismissed.
 */

import * as React from 'react';
import { X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check localStorage for dismissal
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsVisible(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      // Silent failure: install prompt is optional and browser-dependent.
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if installed, dismissed, or no prompt available
  if (isInstalled || isDismissed || !isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 z-[1030]',
        'bg-surface-DEFAULT border border-border-default rounded-lg shadow-lg',
        'p-4 flex items-center gap-3',
        'animate-in slide-in-from-bottom-2 duration-300',
        'max-w-md mx-auto sm:left-auto sm:right-4'
      )}
      role="banner"
      aria-live="polite"
    >
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <Download className="w-5 h-5 text-primary-500" aria-hidden="true" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-offWhite-DEFAULT">
          Install JobFlow
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          Add to your home screen for quick access
        </p>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className={cn(
            'px-3 py-1.5 text-xs font-medium',
            'bg-primary-500 text-offWhite-DEFAULT rounded-md',
            'hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'transition-colors'
          )}
          aria-label="Install JobFlow app"
        >
          Install
        </button>
        
        <button
          onClick={handleDismiss}
          className={cn(
            'p-1 text-text-tertiary hover:text-text-secondary',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded',
            'transition-colors'
          )}
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

