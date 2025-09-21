import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { injectIntl, defineMessages } from 'react-intl';
import VideoPreviewContainer from '/imports/ui/components/video-preview/container';
import * as Styled from './styles';
import PreviewService from '/imports/ui/components/video-preview/service';

const intlMessages = defineMessages({
  title: {
    id: 'app.audioVideoModal.title',
    description: 'Title for the combined audio/video modal',
    defaultMessage: 'Check your audio and video',
  },
  micPermission: {
    id: 'app.audioVideoModal.micPermission',
    description: 'Microphone permission label',
    defaultMessage: 'Microphone permission',
  },
  camPermission: {
    id: 'app.audioVideoModal.camPermission',
    description: 'Camera permission label',
    defaultMessage: 'Camera permission',
  },
  openVideoSettings: {
    id: 'app.audioVideoModal.openVideoSettings',
    description: 'Open the video settings modal',
    defaultMessage: 'Video settings (backgrounds, quality)',
  },
  continueLabel: {
    id: 'app.audioVideoModal.continue',
    description: 'Continue button',
    defaultMessage: 'Continue',
  },
  requesting: {
    id: 'app.audioVideoModal.requesting',
    description: 'Requesting permissions',
    defaultMessage: 'Requesting…',
  },
  granted: {
    id: 'app.audioVideoModal.granted',
    description: 'Permission granted',
    defaultMessage: 'Granted',
  },
  denied: {
    id: 'app.audioVideoModal.denied',
    description: 'Permission denied',
    defaultMessage: 'Denied',
  },
});

const AudioVideoModal = ({ intl, isOpen, setIsOpen, priority, getMicrophonePermissionStatus }) => {
  const videoRef = useRef(null);
  const [bbbVideoStream, setBBBVideoStream] = useState(null);
  const [micStatus, setMicStatus] = useState('requesting'); // requesting | granted | denied
  const [camStatus, setCamStatus] = useState('requesting'); // requesting | granted | denied
  const [showVideoSettings, setShowVideoSettings] = useState(false);

  const stopStream = useCallback(() => {
    if (bbbVideoStream) {
      try {
        PreviewService.terminateCameraStream(bbbVideoStream);
      } catch (_) { /* noop */ }
    }
  }, [bbbVideoStream]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let mounted = true;

    const init = async () => {
      // Microphone permission via audio service
      try {
        const micPerm = await Promise.resolve(
          typeof getMicrophonePermissionStatus === 'function'
            ? getMicrophonePermissionStatus()
            : null,
        );
        if (mounted) setMicStatus(micPerm === true || micPerm === 'granted' ? 'granted' : 'requesting');
      } catch (_) {
        if (mounted) setMicStatus('denied');
      }

      // Camera preview via PreviewService
      try {
        const profile = PreviewService.getDefaultProfile();
        const stream = await PreviewService.doGUM(PreviewService.webcamDeviceId?.(), profile);
        if (!mounted) return;
        setBBBVideoStream(stream);
        setCamStatus('granted');
        if (videoRef.current && stream && stream._mediaStream) {
          videoRef.current.srcObject = stream._mediaStream;
        }
      } catch (_) {
        if (mounted) setCamStatus('denied');
      }
    };

    init();

    return () => {
      mounted = false;
      stopStream();
    };
  }, [isOpen, stopStream]);

  const close = () => setIsOpen(false);

  const statusLabel = (status) => {
    if (status === 'granted') return intl.formatMessage(intlMessages.granted);
    if (status === 'denied') return intl.formatMessage(intlMessages.denied);
    return intl.formatMessage(intlMessages.requesting);
  };

  return (
    <Styled.Background>
      <Styled.AudioVideoModal
        isOpen={isOpen}
        onRequestClose={close}
        contentLabel={intl.formatMessage(intlMessages.title)}
        shouldCloseOnOverlayClick={false}
        ariaHideApp={false}
        data-priority={priority}
      >
        <Styled.Header>{intl.formatMessage(intlMessages.title)}</Styled.Header>
        <Styled.Content>
          <Styled.VideoCol>
            <h3>{intl.formatMessage(intlMessages.camPermission)}</h3>
            <Styled.VideoWrapper>
              <Styled.Video
                ref={videoRef}
                autoPlay
                playsInline
                muted
              />
              <Styled.Badge>
                {statusLabel(camStatus)}
              </Styled.Badge>
            </Styled.VideoWrapper>
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={() => setShowVideoSettings(true)}>
                {intl.formatMessage(intlMessages.openVideoSettings)}
              </button>
            </div>
          </Styled.VideoCol>

          <Styled.MicCol>
            <h3>{intl.formatMessage(intlMessages.micPermission)}</h3>
            <Styled.MicCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{intl.formatMessage(intlMessages.micPermission)}</span>
                <span>•</span>
                <span>{statusLabel(micStatus)}</span>
              </div>
              <div style={{ color: '#666', fontSize: 12 }}>
                Grant access to your microphone. You can fine-tune devices in the next step.
              </div>
            </Styled.MicCard>
          </Styled.MicCol>
        </Styled.Content>
        <Styled.Footer>
          <button type="button" onClick={close}>
            {intl.formatMessage(intlMessages.continueLabel)}
          </button>
        </Styled.Footer>
      </Styled.AudioVideoModal>

      {(true || showVideoSettings) && (
        <VideoPreviewContainer
          {...{
            callbackToClose: () => setShowVideoSettings(false),
            priority: 'medium',
            setIsOpen: setShowVideoSettings,
            isOpen: showVideoSettings,
          }}
        />
      )}
    </Styled.Background>
  );
};

AudioVideoModal.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  priority: PropTypes.string,
  getMicrophonePermissionStatus: PropTypes.func,
};

AudioVideoModal.defaultProps = {
  priority: 'medium',
  getMicrophonePermissionStatus: undefined,
};

export default injectIntl(AudioVideoModal);
