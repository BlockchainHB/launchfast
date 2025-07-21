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
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
          <ReactPlayer
            url={videoSrc}
            width="100%"
            height="100%"
            controls={true}
            playing={isOpen}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload'
                }
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}