'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import ReactPlayer from 'react-player'
import { useState } from 'react'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
}

export function WelcomeModal({ isOpen, onClose, userName }: WelcomeModalProps) {
  const [showVideo, setShowVideo] = useState(false)

  const handleGetStarted = () => {
    onClose()
    // Mark user as welcomed in localStorage to prevent showing again
    localStorage.setItem('launchfast_welcomed', 'true')
  }

  const handleWatchDemo = () => {
    setShowVideo(true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={showVideo ? "max-w-4xl p-6 bg-background" : "max-w-md p-6 bg-background"}
        showCloseButton={!showVideo}
      >
        {!showVideo ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center mb-2">
                Welcome to LaunchFast! 🚀
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4">
              <div className="mb-6">
                <img src="/favicon.svg" alt="LaunchFast" className="h-16 w-16 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {userName ? `Hi ${userName}! ` : 'Hi there! '}
                  Ready to discover profitable Amazon products with our A10-F1 scoring system?
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleWatchDemo}
                  variant="outline" 
                  className="w-full flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Watch Demo Video
                </Button>
                
                <Button 
                  onClick={handleGetStarted}
                  className="w-full"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold mb-4">
                LaunchFast Demo - Welcome!
              </DialogTitle>
            </DialogHeader>
            
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black mb-4">
              <ReactPlayer
                url="/demo.mp4"
                width="100%"
                height="100%"
                controls={true}
                playing={true}
                config={{
                  file: {
                    attributes: {
                      controlsList: 'nodownload'
                    }
                  }
                }}
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowVideo(false)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleGetStarted}
                className="flex-1"
              >
                Get Started
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}