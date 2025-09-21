import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import Styled from './styles';
import { defineMessages } from 'react-intl';

// Type for device state
interface DeviceState {
  devices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
}

const Container = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
  font-size: 1rem;
  align-items: center;
`;

const VideoPreview = styled('video')`
  width: 300px;
  height: 200px;
  max-width: 300px;
  max-height: 200px;
  background: #000;
  border-radius: 8px;
`;

const VideoPreviewBox = styled('div')`
  width: 300px;
  height: 200px;
  max-width: 300px;
  max-height: 200px;
  background: #000;
  border-radius: 8px;
  border: 1px solid #aaa;
  font-size: 1.2rem;
  align-items: center;
  align-content: center;
  justify-content: center;
  display: flex;
`;

const Button = styled('button')`
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background: #0056b3;
  }

  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled('p')`
  color: #dc3545;
  margin: 0.5rem 0;
`;

const LoadingMessage = styled('p')`
  color: #666;
  margin: 0.5rem 0;
`;

const intlMessages = defineMessages({
  NotFoundError: {
    id: 'app.video.notFoundError',
    description: 'error message when can not get webcam video',
  },
  NotAllowedError: {
    id: 'app.video.notAllowed',
    description: 'error message when webcam had permission denied',
  },
  helpSubtitlePermission: {
    id: 'app.audioModal.helpSubtitlePermission',
    description: 'Text description for the audio help subtitle (permission)',
  },
});

export interface SimpleAVPreviewProps {
  intl: {
    formatMessage: (descriptor: { id: string, description?: string }) => string;
  };
}

export const SimpleAVPreview = ({ intl }: SimpleAVPreviewProps) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up stream
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  // Get devices function
  const getDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      console.log('Devices found:', deviceList);
      
      const vDevices = deviceList.filter((device: MediaDeviceInfo) => device.kind === 'videoinput');
      const aDevices = deviceList.filter((device: MediaDeviceInfo) => device.kind === 'audioinput');
      
      setDevices(deviceList);
      setVideoDevices(vDevices);
      setAudioDevices(aDevices);
      
      // Auto-select first device if not selected
      if (!selectedVideo && vDevices.length > 0) {
        setSelectedVideo(vDevices[0].deviceId);
      }
      if (!selectedAudio && aDevices.length > 0) {
        setSelectedAudio(aDevices[0].deviceId);
      }
      
      return { vDevices, aDevices };
    } catch (err) {
      console.error('Error enumerating devices:', err);
      return { vDevices: [], aDevices: [] };
    }
  }, [selectedVideo, selectedAudio]);

  // Initialize and request permissions on mount
  useEffect(() => {
    let mounted = true;
    
    const initializeMedia = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Media devices API not supported');
        }

        // Try different constraint combinations to maximize compatibility
        const constraintOptions = [
          { video: true, audio: true },
          { video: { facingMode: 'user' }, audio: true },
          { video: { facingMode: 'environment' }, audio: true },
          { video: true, audio: false },
          { video: false, audio: true }
        ];

        let mediaStream = null;
        let lastError = null;
        let hasVideo = false;
        let hasAudio = false;

        for (const constraints of constraintOptions) {
          try {
            console.log('@mediaCheck Trying constraints:', constraints);
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Check what we actually got
            const videoTracks = mediaStream.getVideoTracks();
            const audioTracks = mediaStream.getAudioTracks();
            
            if (videoTracks.length > 0) hasVideo = true;
            if (audioTracks.length > 0) hasAudio = true;
            
            console.log('@mediaCheck Success with constraints:::', constraints, 'Video:', hasVideo, 'Audio:', hasAudio);
            
            // If we got both, we're done
            if (hasVideo && hasAudio) break;
            
            // Otherwise, stop this stream and try next
            mediaStream.getTracks().forEach(track => track.stop());
          } catch (err) {
            lastError = err;
            console.log('@mediaCheck Failed with constraints:', constraints, err);
          }
        }

        if (!mediaStream && lastError) {
          throw lastError;
        }

        if (!mounted) {
          if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
          }
          return;
        }

        console.log('@mediaCheck hasVideo', hasVideo);
        console.log('@mediaCheck hasAudio', hasAudio);

        // Update permissions based on what we got
        setPermissions({
          camera: hasVideo,
          microphone: hasAudio
        });

        // Stop the initial stream - we'll create a new one with selected devices
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }

        // Now enumerate devices with labels (after permission)
        const { vDevices, aDevices } = await getDevices();
        
        if (vDevices.length === 0 && aDevices.length === 0) {
          setError('@mediaCheck No camera or microphone devices found. Please connect a device and refresh.');
        } else {
          // Start preview with the selected devices
          if ((hasVideo && selectedVideo) || (hasAudio && selectedAudio)) {
            await startPreviewInternal(
              hasVideo ? selectedVideo : undefined,
              hasAudio ? selectedAudio : undefined
            );
          }
        }
        
      } catch (err: any) {
        if (!mounted) return;
        
        console.error('@mediaCheck Error initializing media:', err);
        
        // Handle specific errors
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(`Camera/Microphone access denied. Please allow access in your browser settings and refresh the page.`);
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera or microphone found. Please connect a camera/microphone and refresh the page.');
          // Still try to enumerate devices
          await getDevices();
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera or microphone is already in use by another application.');
        } else if (err.message === 'Media devices API not supported') {
          setError('Your browser does not support camera/microphone access.');
        } else {
          setError(`Error accessing media devices: ${err.message || err.name || 'Unknown error'}`);
        }
        
        setPermissions({
          camera: false,
          microphone: false
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Helper function to start preview
    const startPreviewInternal = async (videoId?: string, audioId?: string) => {
      try {
        cleanupStream();
        
        const constraints: MediaStreamConstraints = {};
        
        if (videoId) {
          constraints.video = { deviceId: { exact: videoId } };
        } else if (permissions.camera) {
          constraints.video = true;
        }
        
        if (audioId) {
          constraints.audio = { deviceId: { exact: audioId } };
        } else if (permissions.microphone) {
          constraints.audio = true;
        }
        
        if (!constraints.video && !constraints.audio) {
          return;
        }
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current && mediaStream.getVideoTracks().length > 0) {
          videoRef.current.srcObject = mediaStream;
        }
        
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setError(null);
      } catch (err: any) {
        console.error('Error starting preview:', err);
        if (err.name === 'NotFoundError') {
          setError('Selected device not found. Please select a different device.');
        }
      }
    };

    initializeMedia();

    return () => {
      mounted = false;
      cleanupStream();
    };
  }, []); // Only run on mount

  // Start preview when device selection changes
  const startPreview = useCallback(async () => {
    if (!permissions.camera && !permissions.microphone) {
      setError('No permissions granted for camera or microphone');
      return;
    }

    try {
      cleanupStream();
      
      const constraints: MediaStreamConstraints = {};
      
      if (permissions.camera && selectedVideo) {
        constraints.video = { deviceId: { exact: selectedVideo } };
      }
      
      if (permissions.microphone && selectedAudio) {
        constraints.audio = { deviceId: { exact: selectedAudio } };
      }
      
      if (!constraints.video && !constraints.audio) {
        return;
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current && mediaStream.getVideoTracks().length > 0) {
        videoRef.current.srcObject = mediaStream;
      }
      
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
    } catch (err: any) {
      console.error('Error starting preview:', err);
      
      if (err.name === 'NotAllowedError') {
        setError(intl.formatMessage(intlMessages.NotAllowedError));
      } else if (err.name === 'NotFoundError') {
        setError('Selected device not found. Please select a different device.');
      } else {
        setError(`Could not start preview: ${err.message || err.name}`);
      }
    }
  }, [selectedVideo, selectedAudio, permissions, cleanupStream, intl]);

  // Update preview when device selection changes
  useEffect(() => {
    if (!isLoading && (selectedVideo || selectedAudio)) {
      startPreview();
    }
  }, [selectedVideo, selectedAudio, isLoading]);

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('Device change detected');
      getDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [getDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return (
    <Container>
      <VideoPreviewBox>
        {isLoading ? (
          <LoadingMessage>Requesting camera and microphone access...</LoadingMessage>
        ) : !permissions.camera ? (
          <ErrorMessage>
            {error || intl.formatMessage(intlMessages.NotFoundError)}
          </ErrorMessage>
        ) : (
          <VideoPreview 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
          />
        )}
      </VideoPreviewBox>
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Camera:
          </label>
          {videoDevices.length > 0 ? (
            <Styled.DeviceSelect
              value={selectedVideo}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedVideo(e.target.value)}
              disabled={!permissions.camera || isLoading}
              style={{ width: '100%', fontSize: '12px', fontWeight: 'normal' }}
            >
              {videoDevices.map((device: MediaDeviceInfo, index: number) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))}
            </Styled.DeviceSelect>
          ) : (
            <ErrorMessage>
              {isLoading ? 'Loading...' : 'No cameras found'}
            </ErrorMessage>
          )}
        </div>
        
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', }}>
            Microphone:
          </label>
          {audioDevices.length > 0 ? (
            <Styled.DeviceSelect
              value={selectedAudio}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedAudio(e.target.value)}
              disabled={!permissions.microphone || isLoading}
              style={{ width: '100%', fontSize: '12px', fontWeight: 'normal' }}
            >
              {audioDevices.map((device: MediaDeviceInfo, index: number) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${index + 1}`}
                </option>
              ))}
            </Styled.DeviceSelect>
          ) : (
            <ErrorMessage>
              {isLoading ? 'Loading...' : 'No microphones found'}
            </ErrorMessage>
          )}
        </div>
      </div>

      {error && !isLoading && <ErrorMessage>{error}</ErrorMessage>}
    </Container>
  );
};