import React, { useState, useEffect, useRef } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import styled from 'styled-components';
import Button from '/imports/ui/components/common/button/component';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  max-width: 500px;
  margin: 0 auto;
`;

const VideoPreview = styled.video`
  width: 100%;
  max-width: 100%;
  background: #000;
  border-radius: 8px;
`;

const PermissionPrompt = styled.div`
  text-align: center;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
`;

const messages = defineMessages({
  title: {
    id: 'app.avPreview.title',
    description: 'Title for AV preview',
    defaultMessage: 'Audio/Video Preview',
  },
  requestPermission: {
    id: 'app.avPreview.requestPermission',
    description: 'Button to request permissions',
    defaultMessage: 'Allow Camera & Microphone',
  },
  permissionDenied: {
    id: 'app.avPreview.permissionDenied',
    description: 'Message when permissions are denied',
    defaultMessage: 'Please enable camera and microphone permissions to continue',
  },
});

const SimpleAVPreview = ({ onReady, intl }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const requestPermissions = async () => {
    try {
      // Request both audio and video permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // Set the stream to the video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setHasPermission(true);
      setError(null);
      
      // Notify parent that we're ready
      if (onReady) onReady(stream);
      
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError(err);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  return (
    <Container>
      <h2>{intl.formatMessage(messages.title)}</h2>
      
      {!hasPermission ? (
        <PermissionPrompt>
          {error ? (
            <p>{intl.formatMessage(messages.permissionDenied)}</p>
          ) : null}
          <Button
            color="primary"
            label={intl.formatMessage(messages.requestPermission)}
            onClick={requestPermissions}
          />
        </PermissionPrompt>
      ) : (
        <VideoPreview
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />
      )}
    </Container>
  );
};

export default injectIntl(SimpleAVPreview);
