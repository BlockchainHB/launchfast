'use client'

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

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
          <video 
            controls 
            width="100%" 
            height="100%"
            autoPlay={isOpen}
            className="w-full h-full"
            controlsList="nodownload"
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  )
}