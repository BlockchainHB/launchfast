'use client'

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import ReactPlayer from 'react-player'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoSrc: string
  title?: string
}

export function VideoModal({ isOpen, onClose, videoSrc, title = "Demo Video" }: VideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl p-6 bg-background"
        showCloseButton={true}
      >
        <DialogTitle className="text-xl font-semibold mb-4">{title}</DialogTitle>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Testing video: {videoSrc}
          </div>
          
          {/* React Player */}
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-red-900 border-2 border-red-500">
            <ReactPlayer
              url={videoSrc}
              width="100%"
              height="100%"
              controls={true}
              playing={isOpen}
              onError={(error) => {
                console.error('ReactPlayer error:', error)
                alert('ReactPlayer Error: ' + JSON.stringify(error))
              }}
              onReady={() => {
                console.log('ReactPlayer ready:', videoSrc)
                alert('ReactPlayer Ready!')
              }}
              onStart={() => {
                console.log('ReactPlayer started')
                alert('ReactPlayer Started!')
              }}
              config={{
                file: {
                  attributes: {
                    controlsList: 'nodownload'
                  }
                }
              }}
            />
          </div>
          
          {/* Native HTML5 Video for comparison */}
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-blue-900 border-2 border-blue-500">
            <video 
              controls 
              width="100%" 
              height="100%"
              onError={(e) => {
                console.error('Native video error:', e)
                alert('Native Video Error!')
              }}
              onLoadedData={() => {
                console.log('Native video loaded')
                alert('Native Video Loaded!')
              }}
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}