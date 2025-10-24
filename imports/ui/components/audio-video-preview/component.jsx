import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  defineMessages, injectIntl, FormattedMessage,
} from 'react-intl';
import VirtualBgSelector from '/imports/ui/components/video-preview/virtual-background/component'
import logger from '/imports/startup/client/logger';
import browserInfo from '/imports/utils/browserInfo';
import PreviewService from './service';
import VideoService from '/imports/ui/components/video-provider/service';
import Styled from './styles';
import deviceInfo from '/imports/utils/deviceInfo';
import MediaStreamUtils from '/imports/utils/media-stream-utils';
import { notify } from '/imports/ui/services/notification';
import {
  EFFECT_TYPES,
  setSessionVirtualBackgroundInfo,
  getSessionVirtualBackgroundInfo,
  removeSessionVirtualBackgroundInfo,
  isVirtualBackgroundSupported,
  getSessionVirtualBackgroundInfoWithDefault,
  setCameraBrightnessInfo,
  getCameraBrightnessInfo,
} from '/imports/ui/services/virtual-background/service';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import Checkbox from '/imports/ui/components/common/checkbox/component'
import AppService from '/imports/ui/components/app/service';
import { CustomVirtualBackgroundsContext } from '/imports/ui/components/video-preview/virtual-background/context';
import VBGSelectorService from '/imports/ui/components/video-preview/virtual-background/service';
import Session from '/imports/ui/services/storage/in-memory';
import getFromUserSettings from '/imports/ui/services/users-settings';
import { isEqual } from 'radash';
import DeviceSelector from '/imports/ui/components/audio/device-selector/component';
import {
  muteAway,
} from '/imports/ui/components/audio/audio-graphql/audio-controls/input-stream-live-selector/service';
import Button from '/imports/ui/components/common/button/component';
import { hasMediaDevicesEventTarget } from '/imports/ui/services/webrtc-base/utils';

const VIEW_STATES = {
  finding: 'finding',
  found: 'found',
  error: 'error',
};

const DEFAULT_BRIGHTNESS_STATE = {
  brightness: 100,
  wholeImageBrightness: false,
}

const propTypes = {
  intl: PropTypes.object.isRequired,
  closeModal: PropTypes.func.isRequired,
  startSharing: PropTypes.func.isRequired,
  stopSharing: PropTypes.func.isRequired,
  resolve: PropTypes.func,
  camCapReached: PropTypes.bool,
  hasVideoStream: PropTypes.bool.isRequired,
  webcamDeviceId: PropTypes.string,
  sharedDevices: PropTypes.arrayOf(PropTypes.string),
  joinMic: PropTypes.func,
  inputDeviceId: PropTypes.string,
  outputDeviceId: PropTypes.string,
  showPermissionsOvelay: PropTypes.bool,
  changeInputDevice: PropTypes.func,
  AudioError: PropTypes.shape({
    MIC_ERROR: PropTypes.shape({
      UNKNOWN: PropTypes.number,
      NO_SSL: PropTypes.number,
      MAC_OS_BLOCK: PropTypes.number,
      NO_PERMISSION: PropTypes.number,
      DEVICE_NOT_FOUND: PropTypes.number,
    }),
  }).isRequired,
  
  getMicrophonePermissionStatus: PropTypes.func,
  hasMicrophonePermission: PropTypes.func.isRequired,
  permissionStatus: PropTypes.string,
  
};

const defaultProps = {
  resolve: null,
  camCapReached: true,
  webcamDeviceId: null,
  sharedDevices: [],
};

const intlMessages = defineMessages({
  webcamVirtualBackgroundTitle: {
    id: 'app.videoPreview.webcamVirtualBackgroundLabel',
    description: 'Title for the virtual background modal',
  },
  webcamSettingsTitle: {
    id: 'app.videoPreview.webcamSettingsTitle',
    description: 'Title for the video preview modal',
  },
  closeLabel: {
    id: 'app.videoPreview.closeLabel',
    description: 'Close button label',
  },
  cancelLabel: {
    id: 'app.mobileAppModal.dismissLabel',
    description: 'Close button label',
  },
  webcamPreviewLabel: {
    id: 'app.videoPreview.webcamPreviewLabel',
    description: 'Webcam preview label',
  },
  cameraLabel: {
    id: 'app.videoPreview.cameraLabel',
    description: 'Camera dropdown label',
  },
  qualityLabel: {
    id: 'app.videoPreview.profileLabel',
    description: 'Quality dropdown label',
  },
  low: {
    id: 'app.videoPreview.quality.low',
    description: 'Low quality option label',
  },
  medium: {
    id: 'app.videoPreview.quality.medium',
    description: 'Medium quality option label',
  },
  high: {
    id: 'app.videoPreview.quality.high',
    description: 'High quality option label',
  },
  hd: {
    id: 'app.videoPreview.quality.hd',
    description: 'High definition option label',
  },
  startSharingLabel: {
    id: 'app.videoPreview.startSharingLabel',
    description: 'Start sharing button label',
  },
  stopSharingLabel: {
    id: 'app.videoPreview.stopSharingLabel',
    description: 'Stop sharing button label',
  },
  stopSharingAllLabel: {
    id: 'app.videoPreview.stopSharingAllLabel',
    description: 'Stop sharing all button label',
  },
  sharedCameraLabel: {
    id: 'app.videoPreview.sharedCameraLabel',
    description: 'Already Shared camera label',
  },
  findingWebcamsLabel: {
    id: 'app.videoPreview.findingWebcamsLabel',
    description: 'Finding webcams label',
  },
  webcamOptionLabel: {
    id: 'app.videoPreview.webcamOptionLabel',
    description: 'Default webcam option label',
  },
  webcamNotFoundLabel: {
    id: 'app.videoPreview.webcamNotFoundLabel',
    description: 'Webcam not found label',
  },
  profileNotFoundLabel: {
    id: 'app.videoPreview.profileNotFoundLabel',
    description: 'Profile not found label',
  },
  permissionError: {
    id: 'app.video.permissionError',
    description: 'Error message for webcam permission',
  },
  AbortError: {
    id: 'app.video.abortError',
    description: 'Some problem occurred which prevented the device from being used',
  },
  OverconstrainedError: {
    id: 'app.video.overconstrainedError',
    description: 'No candidate devices which met the criteria requested',
  },
  SecurityError: {
    id: 'app.video.securityError',
    description: 'Media support is disabled on the Document',
  },
  TypeError: {
    id: 'app.video.typeError',
    description: 'List of constraints specified is empty, or has all constraints set to false',
  },
  NotFoundError: {
    id: 'app.video.notFoundError',
    description: 'error message when can not get webcam video',
  },
  NotAllowedError: {
    id: 'app.video.notAllowed',
    description: 'error message when webcam had permission denied',
  },
  NotSupportedError: {
    id: 'app.video.notSupportedError',
    description: 'error message when origin do not have ssl valid',
  },
  NotReadableError: {
    id: 'app.video.notReadableError',
    description: 'error message When the webcam is being used by other software',
  },
  TimeoutError: {
    id: 'app.video.timeoutError',
    description: 'error message when promise did not return',
  },
  iOSError: {
    id: 'app.audioModal.iOSBrowser',
    description: 'Audio/Video Not supported warning',
  },
  iOSErrorDescription: {
    id: 'app.audioModal.iOSErrorDescription',
    description: 'Audio/Video not supported description',
  },
  iOSErrorRecommendation: {
    id: 'app.audioModal.iOSErrorRecommendation',
    description: 'Audio/Video recommended action',
  },
  genericError: {
    id: 'app.video.genericError',
    description: 'error message for when the webcam sharing fails with unknown error',
  },
  camCapReached: {
    id: 'app.video.camCapReached',
    description: 'message for when the camera cap has been reached',
  },
  virtualBgGenericError: {
    id: 'app.video.virtualBackground.genericError',
    description: 'Failed to apply camera effect',
  },
  inactiveError: {
    id: 'app.video.inactiveError',
    description: 'Camera stopped unexpectedly',
  },
  brightness: {
    id: 'app.videoPreview.brightness',
    description: 'Brightness label',
  },
  wholeImageBrightnessLabel: {
    id: 'app.videoPreview.wholeImageBrightnessLabel',
    description: 'Whole image brightness label',
  },
  wholeImageBrightnessDesc: {
    id: 'app.videoPreview.wholeImageBrightnessDesc',
    description: 'Whole image brightness aria description',
  },
  cameraAsContentSettingsTitle: {
    id: 'app.videoPreview.cameraAsContentSettingsTitle',
    description: 'Title for the video preview modal when sharing camera as content',
  },
  sliderDesc: {
    id: 'app.videoPreview.sliderDesc',
    description: 'Brightness slider aria description',
  },
  testSpeakerLabel: {
    id: 'app.audio.audioSettings.testSpeakerLabel',
    description: 'Test speaker label',
  },
  captionsSelectorLabel: {
    id: 'app.audio.captions.speech.title',
    description: 'Audio speech recognition title',
  },
  backLabel: {
    id: 'app.audio.backLabel',
    description: 'audio settings back button label',
  },
  micSourceLabel: {
    id: 'app.audio.audioSettings.microphoneSourceLabel',
    description: 'Label for mic source',
  },
  speakerSourceLabel: {
    id: 'app.audio.audioSettings.speakerSourceLabel',
    description: 'Label for speaker source',
  },
  streamVolumeLabel: {
    id: 'app.audio.audioSettings.microphoneStreamLabel',
    description: 'Label for stream volume',
  },
  retryLabel: {
    id: 'app.audio.joinAudio',
    description: 'Confirmation button label',
  },
  deviceChangeFailed: {
    id: 'app.audioNotification.deviceChangeFailed',
    description: 'Device change failed',
  },
  confirmLabel: {
    id: 'app.audio.audioSettings.confirmLabel',
    description: 'Audio settings confirmation button label',
  },
  cancelLabel: {
    id: 'app.audio.audioSettings.cancelLabel',
    description: 'Audio settings cancel button label',
  },
  findingDevicesTitle: {
    id: 'app.audio.audioSettings.findingDevicesTitle',
    description: 'Message for finding audio devices',
  },
  noMicSelectedWarning: {
    id: 'app.audio.audioSettings.noMicSelectedWarning',
    description: 'Warning when no mic is selected',
  },
  baseSubtitle: {
    id: 'app.audio.audioSettings.baseSubtitle',
    description: 'Base subtitle for audio settings',
  },
  helpSubtitlePermission: {
    id: 'app.audioModal.helpSubtitlePermission',
    description: 'Text description for the audio help subtitle (permission)',
  },
});

class VideoPreview extends Component {
  static contextType = CustomVirtualBackgroundsContext;

  constructor(props) {
    super(props);

    const {
      webcamDeviceId,
      inputDeviceId,
      outputDeviceId,
      permissionStatus,
      // unmuteOnExit,
    } = props;

    this.handleProceed = this.handleProceed.bind(this);
    this.handleStartSharing = this.handleStartSharing.bind(this);
    this.handleStopSharing = this.handleStopSharing.bind(this);
    this.handleStopSharingAll = this.handleStopSharingAll.bind(this);
    this.handleSelectWebcam = this.handleSelectWebcam.bind(this);
    this.handleSelectProfile = this.handleSelectProfile.bind(this);
    this.handleVirtualBgSelected = this.handleVirtualBgSelected.bind(this);
    this.handleLocalStreamInactive = this.handleLocalStreamInactive.bind(this);
    this.handleBrightnessAreaChange = this.handleBrightnessAreaChange.bind(this);
    this.handleSelectTab = this.handleSelectTab.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleOutputChange = this.handleOutputChange.bind(this);
    this.updateDeviceList = this.updateDeviceList.bind(this);
    this.checkMicrophonePermission = this.checkMicrophonePermission.bind(this);
    this.handleConfirmationClick = this.handleConfirmationClick.bind(this);

    this._isMounted = false;

    this.state = {
      webcamDeviceId,
      selectedTab: 0,
      availableWebcams: null,
      selectedProfile: null,
      isStartSharingDisabled: false,
      viewState: VIEW_STATES.finding,
      deviceError: null,
      previewError: null,
      brightness: 100,
      wholeImageBrightness: false,
      skipPreviewFailed: false,
      inputDeviceId,
      outputDeviceId,
      // If streams need to be produced, device selectors and audio join are
      // blocked until at least one stream is generated
      producingStreams: props.produceStreams,
      stream: null,
      
      audioInputDevices: [],
      audioOutputDevices: [],
      findingDevices: permissionStatus === 'prompt' || permissionStatus === 'denied',
      disableActions: false,
      errorInfo: null,
      hasError: false,
      muted: false,
      showVideo: true,
    };
  }

  set currentVideoStream (bbbVideoStream) {
    // Stream is being unset - remove gUM revocation handler to avoid false negatives
    if (this._currentVideoStream) {
      this._currentVideoStream.removeListener('inactive', this.handleLocalStreamInactive);
    }
    // Set up inactivation handler for the new stream (to, eg, detect gUM revocation)
    if (bbbVideoStream) {
      bbbVideoStream.once('inactive', this.handleLocalStreamInactive);
    }
    this._currentVideoStream = bbbVideoStream;
  }

  get currentVideoStream () {
    return this._currentVideoStream;
  }

  shouldSkipVideoPreview() {
    const { skipPreviewFailed } = this.state;
    const { cameraAsContent, forceOpen, webcamDeviceId } = this.props;

    // If the initial stream is already shared give the user the chance to choose the device
    const shared = this.isAlreadyShared(webcamDeviceId);

    return PreviewService.getSkipVideoPreview() && !forceOpen && !skipPreviewFailed && !shared;
  }

  componentDidMount() {
    const {
      webcamDeviceId,
      forceOpen,
      permissionStatus,
    } = this.props;

    const {
      inputDeviceId,
      outputDeviceId,
    } = this.state;

    this._isMounted = true;

 const populatePreview = ({
      digestedWebcams = [],
      devices,
      areLabelled,
      areIdentified,
    } = { }) => {
      if (devices) VideoService.updateNumberOfDevices(devices);
      // Video preview skip is activated, short circuit via a simpler procedure
      if (PreviewService.getSkipVideoPreview() && !forceOpen) {
        this.skipVideoPreview();
        return;
      }
      // Late enumerateDevices resolution, stop.
      if (!this._isMounted) return;

      let processedCamerasList = digestedWebcams;
      const initialDeviceId = processedCamerasList[0]?.deviceId || webcamDeviceId;

      this.getInitialCameraStream(initialDeviceId)
        .then(async () => {
          // Late gUM resolve, stop.
          if (!this._isMounted) return;

          if (!areLabelled || !areIdentified) {
            // If they aren't labelled or have nullish deviceIds, run
            // enumeration again and get their full versions
            // Why: fingerprinting countermeasures obfuscate those when
            // no permission was granted via gUM
            try {
              const {
                devices: newDevices,
                digestedWebcams: newDigestedWebcams,
              } = await PreviewService.doEnumerateDevices({ priorityDeviceId: webcamDeviceId });
              processedCamerasList = newDigestedWebcams;
              VideoService.updateNumberOfDevices(newDevices);
            } catch (error) {
              // Not a critical error beucase it should only affect UI; log it
              // and go ahead
              logger.error({
                logCode: 'video_preview_enumerate_relabel_failure',
                extraInfo: {
                  errorName: error.name, errorMessage: error.message,
                },
              }, 'enumerateDevices for relabelling failed');
            }
          }

          if (processedCamerasList.length > 0) {
            this.setState({
              availableWebcams: processedCamerasList,
              viewState: VIEW_STATES.found,
            });
            this.displayPreview();
          } else {
            // There were no webcams coming from enumerateDevices. Throw an error.
            const noWebcamsError = new Error('NotFoundError');
            this.handleDeviceError('enumerate', noWebcamsError, ': no webcams found');
          }
        });
    };

     if (deviceInfo.hasMediaDevices) {
      const SKIP_INITIAL_ENUM = window.meetingClientSettings.public.media.skipInitialCamEnumeration;
      if (SKIP_INITIAL_ENUM) {
        populatePreview({
          digestedWebcams: [],
          devices: [],
          areLabelled: false,
          areIdentified: false,
        });
      } else {
        PreviewService.doEnumerateDevices({ priorityDeviceId: webcamDeviceId })
          .then(populatePreview)
          .catch((error) => {
            // Late enumerateDevices rejection, stop.
            logger.error({
              logCode: 'video_preview_enumerate_failure',
              extraInfo: {
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack,
              },
            }, 'video-preview: enumerateDevices failed');
            // Try populating the preview anyways after an initial gUM is run.
            populatePreview();
          });
      }
    } else {
      // Top-level navigator.mediaDevices is not supported.
      // The session went through the version checking, but somehow ended here.
      // Nothing we can do.
      const error = new Error('NotSupportedError');
      this.handleDeviceError('mount', error, ': navigator.mediaDevices unavailable');
    }


    this._isMountedAudio = true;
    // // Guarantee initial in/out devices are initialized on all ends
    // AudioManager.isEchoTest = true;
    this.checkMicrophonePermission({ gumOnPrompt: true, permissionStatus })
      .then(this.updateDeviceList)
      .then(() => {
        if (!this._isMountedAudio) return;

        if (hasMediaDevicesEventTarget()) {
          navigator.mediaDevices.addEventListener(
            'devicechange',
            this.updateDeviceList,
          );
        }
        this.setState({ findingDevices: false });
        this.setInputDevice(inputDeviceId);
        this.setOutputDevice(outputDeviceId);
      });
  }

  componentDidUpdate(prevProps) {
    const { viewState, webcamDeviceId } = this.state;
    if (viewState === VIEW_STATES.found && !this.video?.srcObject) {
      this.displayPreview();
    }

    if (this.brightnessMarker) {
      const markerStyle = window.getComputedStyle(this.brightnessMarker);
      const left = parseFloat(markerStyle.left);
      const right = parseFloat(markerStyle.right);

      if (left < 0) {
        this.brightnessMarker.style.left = '0px';
        this.brightnessMarker.style.right = 'auto';
      } else if (right < 0) {
        this.brightnessMarker.style.right = '0px';
        this.brightnessMarker.style.left = 'auto';
      }
    }

    const { permissionStatus } = this.props;

    if (prevProps.permissionStatus !== permissionStatus) {
      this.updateDeviceList();
    }
  }

  componentWillUnmount() {
    const { webcamDeviceId } = this.state;
    this.terminateCameraStream(this.currentVideoStream, webcamDeviceId);
    this.cleanupStreamAndVideo();
    this._isMounted = false;
    Session.setItem('videoPreviewFirstOpen', false);
  }

  handleInputChange(deviceId) {
    this.setInputDevice(deviceId);
  }

  handleOutputChange(deviceId) {
    this.setOutputDevice(deviceId);
  }


  setInputDevice(deviceId) {
      const {
        isConnected,
        handleGUMFailure,
        changeInputDevice,
        produceStreams,
        intl,
        notify,
      } = this.props;
      const {
        inputDeviceId: currentInputDeviceId,
        audioInputDevices,
        audioOutputDevices,
      } = this.state;
      try {
        if (!isConnected) changeInputDevice(deviceId);
  
        // Only generate input streams if they're going to be used with something
        // In this case, the volume meter or local echo test.
        if (produceStreams) {
          this.setState({
            producingStreams: true,
          });
          this.generateInputStream(deviceId).then((stream) => {
            // Extract the deviceId again from the stream to guarantee consistency
            // between stream DID vs chosen DID. That's necessary in scenarios where,
            // eg, there's no default/pre-set deviceId ('') and the browser's
            // default device has been altered by the user (browser default != system's
            // default).
            let extractedDeviceId = deviceId;
  
            if (stream) {
              extractedDeviceId = MediaStreamUtils.extractDeviceIdFromStream(stream, 'audio');
  
              if (extractedDeviceId !== deviceId && !isConnected) {
                changeInputDevice(extractedDeviceId);
              }
            }
  
            // Component unmounted after gUM resolution -> skip echo rendering
            if (!this._isMounted) return;
  
            this.setState({
              inputDeviceId: extractedDeviceId,
              stream,
            });
  
            // Update the device list after the stream has been generated.
            // This is necessary to guarantee the device list is up-to-date, mainly
            // in Firefox as it omit labels if no active stream is present (even if
            // gUM permission is flagged as granted).
            this.updateDeviceList();
          }).catch((error) => {
            const handleFailure = (devices) => {
              const inputDevices = devices?.audioInputDevices.map((device) => device.toJSON());
              const outputDevices = devices?.audioOutputDevices.map((device) => device.toJSON());
              logger.warn({
                logCode: 'audiosettings_gum_failed',
                extraInfo: {
                  inputDeviceId: deviceId,
                  inputDevices,
                  outputDevices,
                  errorMessage: error.message,
                  errorName: error.name,
                },
              }, `Audio settings gUM failed: ${error.name}`);
              handleGUMFailure(error);
            };
  
            // Forcibly run enumeration after gUM failure to add I/O data to the
            // error log for better debugging.
            if ((audioInputDevices.length === 0 || audioOutputDevices.length === 0)
              && this._isMounted) {
              this.updateDeviceList().then(handleFailure);
            } else {
              handleFailure({ audioInputDevices, audioOutputDevices });
            }
          }).finally(() => {
            // Component unmounted after gUM resolution -> skip echo rendering
            if (!this._isMounted) return;
  
            this.setState({
              producingStreams: false,
            });
          });
        } else {
          this.setState({
            inputDeviceId: deviceId,
          });
        }
      } catch (error) {
        logger.debug(
          {
            logCode: 'audiosettings_input_device_change_failure',
            extraInfo: {
              errorName: error.name,
              errorMessage: error.message,
              deviceId: currentInputDeviceId,
              newDeviceId: deviceId,
            },
          },
          `Audio settings: error changing input device - {${error.name}: ${error.message}}`,
        );
        notify(intl.formatMessage(intlMessages.deviceChangeFailed), true);
      }
    }

    checkMicrophonePermission(options) {

      const { hasMicrophonePermission, handleGUMFailure } = this.props;

      this.setState({
        findingDevices: true,
      });
  
      return hasMicrophonePermission(options)
        .then((hasPermission) => {
          // null means undetermined, so we don't want to show the error modal
          // and let downstream components figure it out
          if (hasPermission === true || hasPermission === null) {
            return hasPermission;
          }
  
          handleGUMFailure(new DOMException(
            'Permissions API says denied',
            'NotAllowedError',
          ));
  
          return false;
        })
        .catch((error) => {
          handleGUMFailure(error);
          return null;
        })
        .finally(() => {
          this.setState({
            findingDevices: false,
          });
        });
    };

  setOutputDevice(deviceId) {
    const { outputDeviceId: currentOutputDeviceId } = this.state;
    const {
      changeOutputDevice,
      withEcho,
      intl,
      notify,
    } = this.props;

    // withEcho usage (isLive arg): if local echo is enabled we need the device
    // change to be performed seamlessly (which is what the isLive parameter guarantees)
    changeOutputDevice(deviceId, withEcho)
      .then(() => {
        this.setState({
          outputDeviceId: deviceId,
        });
      })
      .catch((error) => {
        logger.debug({
          logCode: 'audiosettings_output_device_change_failure',
          extraInfo: {
            errorName: error.name,
            errorMessage: error.message,
            deviceId: currentOutputDeviceId,
            newDeviceId: deviceId,
          },
        }, `Audio settings: error changing output device - {${error.name}: ${error.message}}`);
        notify(intl.formatMessage(intlMessages.deviceChangeFailed), true);
      });
  }

  updateDeviceList() {
    const { updateInputDevices, updateOutputDevices } = this.props;

    return navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const audioInputDevices = devices.filter((i) => i.kind === 'audioinput');
        const audioOutputDevices = devices.filter((i) => i.kind === 'audiooutput');

        // Update audio devices in AudioManager
        updateInputDevices(audioInputDevices);
        updateOutputDevices(audioOutputDevices);
        this.setState({
          audioInputDevices,
          audioOutputDevices,
        });

        return {
          audioInputDevices,
          audioOutputDevices,
        };
      })
      .catch((error) => {
        logger.warn({
          logCode: 'audiosettings_enumerate_devices_error',
          extraInfo: {
            errorName: error.name,
            errorMessage: error.message,
          },
        }, `Audio settings: error enumerating devices - {${error.name}: ${error.message}}`);
      });
  }

  async startCameraBrightness(initialState = DEFAULT_BRIGHTNESS_STATE) {
    const ENABLE_CAMERA_BRIGHTNESS = window.meetingClientSettings.public.app.enableCameraBrightness;
    const CAMERA_BRIGHTNESS_AVAILABLE = ENABLE_CAMERA_BRIGHTNESS && isVirtualBackgroundSupported();

    if (CAMERA_BRIGHTNESS_AVAILABLE && this.currentVideoStream) {
      const setBrightnessInfo = () => {
        const stream = this.currentVideoStream || {};
        const service = stream.virtualBgService || {};
        const { brightness = 100, wholeImageBrightness = false } = service;
        this.setState({ brightness, wholeImageBrightness });
      };

      const applyStreamBrightnessState = () => {
        if (!this.currentVideoStream) return;
        this.currentVideoStream.changeCameraBrightness(initialState.brightness);
        this.currentVideoStream.toggleCameraBrightnessArea(initialState.wholeImageBrightness);
      };

      if (!this.currentVideoStream?.virtualBgService) {
        const switched = await this.startVirtualBackground(
          this.currentVideoStream,
          EFFECT_TYPES.NONE_TYPE,
        );
        if (switched) {
          applyStreamBrightnessState();
          setBrightnessInfo();
        }
      } else {
        applyStreamBrightnessState();
        setBrightnessInfo();
      }
    }
  }

  async setCameraBrightness(brightness) {
    const ENABLE_CAMERA_BRIGHTNESS = window.meetingClientSettings.public.app.enableCameraBrightness;
    const CAMERA_BRIGHTNESS_AVAILABLE = ENABLE_CAMERA_BRIGHTNESS && isVirtualBackgroundSupported();

    if (CAMERA_BRIGHTNESS_AVAILABLE && this.currentVideoStream) {
      if (this.currentVideoStream?.virtualBgService == null) {
        await this.startCameraBrightness();
      }

      const { webcamDeviceId } = this.state;
      const shared = this.isAlreadyShared(webcamDeviceId);
      this.currentVideoStream.changeCameraBrightness(brightness);
      this.setState({ brightness }, () => {
        if (shared) this.updateCameraBrightnessInfo();
      });
    }
  }

  handleSelectWebcam(event) {
    const webcamValue = event.target.value;

    this.getInitialCameraStream(webcamValue).then(() => {
      this.displayPreview();
    });
  }

  handleLocalStreamInactive({ id }) {
    // id === MediaStream.id
    if (this.currentVideoStream
      && typeof id === 'string'
      && this.currentVideoStream?.mediaStream?.id === id) {
      this.setState({
        isStartSharingDisabled: true,
      });
      console.log('@mediaCheck2 handleLocalStreamInactive', id);
      this.handlePreviewError(
        'stream_inactive',
        new Error('inactiveError'),
        '- preview camera stream inactive',
      );
    }
  }

  updateVirtualBackgroundInfo () {
    const { webcamDeviceId } = this.state;

    if (this.currentVideoStream) {
      setSessionVirtualBackgroundInfo(
        webcamDeviceId,
        this.currentVideoStream.virtualBgType,
        this.currentVideoStream.virtualBgName,
        this.currentVideoStream.virtualBgUniqueId,
      );
    }
  };

  updateCameraBrightnessInfo() {
    const { webcamDeviceId } = this.state;

    if (this.currentVideoStream) {
      setCameraBrightnessInfo(
        webcamDeviceId,
        this.state.brightness,
        this.state.wholeImageBrightness,
      );
    }
  }

  // Resolves into true if the background switch is successful, false otherwise
  handleVirtualBgSelected(type, name, customParams) {
    const { sharedDevices } = this.props;
    const { webcamDeviceId, brightness } = this.state;
    const shared = this.isAlreadyShared(webcamDeviceId);

    const ENABLE_CAMERA_BRIGHTNESS = window.meetingClientSettings.public.app.enableCameraBrightness;
    const CAMERA_BRIGHTNESS_AVAILABLE = ENABLE_CAMERA_BRIGHTNESS && isVirtualBackgroundSupported();

    if (type !== EFFECT_TYPES.NONE_TYPE || CAMERA_BRIGHTNESS_AVAILABLE && brightness !== 100) {
      return this.startVirtualBackground(this.currentVideoStream, type, name, customParams).then((switched) => {
        if (switched) this.updateVirtualBackgroundInfo();
        return switched;
      });
    } else {
      this.stopVirtualBackground(this.currentVideoStream);
      if (shared) this.updateVirtualBackgroundInfo();
      return Promise.resolve(true);
    }
  }

  stopVirtualBackground(bbbVideoStream) {
    if (bbbVideoStream) {
      bbbVideoStream.stopVirtualBackground();
      this.displayPreview();
    }
  }

  startVirtualBackground(bbbVideoStream, type, name, customParams) {
    this.setState({ isStartSharingDisabled: true });

    if (bbbVideoStream == null) return Promise.resolve(false);

    return bbbVideoStream.startVirtualBackground(type, name, customParams).then(() => {
      this.displayPreview();
      return true;
    }).catch(error => {
      this.handleVirtualBgError(error, type, name);
      return false;
    }).finally(() => {
      this.setState({ isStartSharingDisabled: false });
    });
  }

  handleSelectProfile(event) {
    const profileValue = event.target.value;
    const { webcamDeviceId } = this.state;

    const selectedProfile = PreviewService.getCameraProfile(profileValue);

    this.getCameraStream(webcamDeviceId, selectedProfile).then(() => {
      this.displayPreview();
    }).catch(error => {
      console.error('@mediaCheck2 Error in handleSelectProfile', error);
    });
  }

  async handleStartSharing() {
    const {
      resolve,
      startSharing,
      cameraAsContent,
      startSharingCameraAsContent,
    } = this.props;
    const {
      webcamDeviceId,
      selectedProfile,
      brightness,
      deviceError,
      previewError,
    } = this.state;

    // Only streams that will be shared should be stored in the service.
    // If the store call returns false, we're duplicating stuff. So clean this one
    // up because it's an impostor.
    if(!PreviewService.storeStream(webcamDeviceId, this.currentVideoStream)) {
      this.currentVideoStream ? this.currentVideoStream.stop() : null;
    }

    if (
      this.currentVideoStream?.virtualBgService
      && brightness === 100
      && this.currentVideoStream?.virtualBgType === EFFECT_TYPES.NONE_TYPE
    ) {
      this.stopVirtualBackground(this.currentVideoStream);
    }

    const shouldStartVideo= !(deviceError || previewError)

    if (!cameraAsContent) {
      // Store selected profile, camera ID and virtual background in the storage
      // for future use
      PreviewService.changeProfile(selectedProfile);
      PreviewService.changeWebcam(webcamDeviceId);
      this.updateVirtualBackgroundInfo();
      this.updateCameraBrightnessInfo();
      this.cleanupStreamAndVideo();
      if(this.state.showVideo && shouldStartVideo){
        startSharing(webcamDeviceId);
      }
      if(this.props.permissionStatus === "denied" || this.state.muted){
        // join listen only
        this.handleJoinListenOnly();
      }
      else{
        this.handleConfirmationClick();
      }

      setTimeout(() => {
        this.props.closeModal();
      }, 1000);
      
    } else {
      this.cleanupStreamAndVideo();
      startSharingCameraAsContent(webcamDeviceId);
    }
  }


   handleJoinListenOnly = () => {
    if (this.state.disableActions && this.state.isConnecting) return null;

    this.setState({
      muted: true,
      disableActions: true,
      hasError: false,
      errorInfo: null,
    });

    return this.props.joinListenOnly().then(() => {
      this.setState({
        disableActions: false,
      });
      //disableAwayMode();
    }).catch((err) => {
      handleJoinAudioError(err);
    });
  };  

  handleStopSharing() {
    const { resolve, stopSharing, stopSharingCameraAsContent } = this.props;
    const { webcamDeviceId } = this.state;

    if (this.isCameraAsContentDevice(webcamDeviceId)) {
      stopSharingCameraAsContent();
    } else {
      PreviewService.deleteStream(webcamDeviceId);
      stopSharing(webcamDeviceId);
      this.cleanupStreamAndVideo();
    }
    if (resolve) resolve();
  }

  handleStopSharingAll() {
    const { resolve, stopSharing } = this.props;
    stopSharing();
    if (resolve) resolve();
  }

  handleProceed() {
    const { resolve, closeModal, sharedDevices } = this.props;
    const { webcamDeviceId, brightness } = this.state;
    const shared = sharedDevices.includes(webcamDeviceId);

    if (
      (shared)
      && this.currentVideoStream?.virtualBgService
      && brightness === 100
      && this.currentVideoStream?.virtualBgType === EFFECT_TYPES.NONE_TYPE
    ) {
      this.stopVirtualBackground(this.currentVideoStream);
    }

    this.terminateCameraStream(this.currentVideoStream, webcamDeviceId);
    closeModal();
    if (resolve) resolve();
  }

  handlePreviewError(logCode, error, description) {
    logger.warn({
      logCode: `video_preview_${logCode}_error`,
      extraInfo: {
        errorName: error.name,
        errorMessage: error.message,
      },
    }, `Error ${description}`);
    console.warn('@mediaCheck2 Error in handlePreviewError', error);
    this.setState({
      previewError: this.handleGUMError(error),
    });
  }

  handleDeviceError(logCode, error, description) {
    logger.warn({
      logCode: `video_preview_${logCode}_error`,
      extraInfo: {
        errorName: error.name,
        errorMessage: error.message,
      },
    }, `Error ${description}`);
    console.warn('@mediaCheck2 Error in handleDeviceError', error);
    this.setState({
      viewState: VIEW_STATES.error,
      deviceError: this.handleGUMError(error),
    });
  }

  handleGUMError(error) {
    const { intl } = this.props;

    logger.error({
      logCode: 'video_preview_gum_failure',
      extraInfo: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      },
    }, `getUserMedia failed in video-preview: ${error.name} - ${error.message}`);

    const intlError = intlMessages[error.name] || intlMessages[error.message];
    if (intlError) {
      return intl.formatMessage(intlError);
    }

    return intl.formatMessage(intlMessages.genericError,
      { error: `${error.name}: ${error.message}` });
  }

  terminateCameraStream(stream, deviceId) {
    if (stream) {
      // Stream is being destroyed - remove gUM revocation handler to avoid false negatives
      stream.removeListener('inactive', this.handleLocalStreamInactive);
      PreviewService.terminateCameraStream(stream, deviceId);
    }
  }

  cleanupStreamAndVideo() {
    this.currentVideoStream = null;
    if (this.video) this.video.srcObject = null;
  }

  handleVirtualBgError(error, type, name) {
    const { intl } = this.props;
    logger.error({
      logCode: `video_preview_virtualbg_error`,
      extraInfo: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        virtualBgType: type,
        virtualBgName: name,
      },
    }, `Failed to toggle virtual background: ${error.message}`);

    notify(intl.formatMessage(intlMessages.virtualBgGenericError), 'error', 'video');
  }

  updateDeviceId (deviceId) {
    let actualDeviceId = deviceId;

    if (!actualDeviceId && this.currentVideoStream) {
      actualDeviceId = MediaStreamUtils.extractDeviceIdFromStream(
        this.currentVideoStream.mediaStream,
        'video',
      );
    }

    this.setState({ webcamDeviceId: actualDeviceId, });
    return actualDeviceId;
  }

  getInitialCameraStream(deviceId) {
    const { cameraAsContent } = this.props;
    const defaultProfile = !cameraAsContent ? PreviewService.getDefaultProfile() : PreviewService.getCameraAsContentProfile();

    console.log('@mediaCheck2 getInitialCameraStream', deviceId, defaultProfile);
    return this.getCameraStream(deviceId, defaultProfile);
  }

  applyStoredVirtualBg(deviceId = null) {
    const webcamDeviceId = deviceId || this.state.webcamDeviceId;

    // Apply the virtual background stored in Local/Session Storage, if any
    // If it fails, remove the stored background.
    return new Promise((resolve, reject) => {
      let customParams;
      const virtualBackground = getSessionVirtualBackgroundInfo(webcamDeviceId);

      if (virtualBackground) {
        const { type, name, uniqueId } = virtualBackground;
        const handleFailure = (error) => {
          this.handleVirtualBgError(error, type, name);
          removeSessionVirtualBackgroundInfo(webcamDeviceId);
          reject(error);
        };
        const applyCustomVirtualBg = (backgrounds) => {
          const background = backgrounds[uniqueId]
            || Object.values(backgrounds).find(bg => bg.uniqueId === uniqueId);

          if (background && background.data) {
            customParams = {
              uniqueId,
              file: background?.data,
            };
          } else {
            handleFailure(new Error('Missing virtual background data'));
            return;
          }

          this.handleVirtualBgSelected(type, name, customParams).then(resolve, handleFailure);
        };

        // If uniqueId is defined, this is a custom background. Fetch the custom
        // params from the context and apply them
        if (uniqueId) {
          if (this.context.backgrounds[uniqueId]) {
            applyCustomVirtualBg(this.context.backgrounds);
          } else if (!this.context.loaded) {
            // Virtual BG context might not be loaded yet (in case this is
            // skipping the video preview). Load it manually.
            VBGSelectorService.load(handleFailure, applyCustomVirtualBg);
          } else {
            handleFailure(new Error('Missing virtual background'));
          }

          return;
        }

        // Built-in background, just apply it.
        this.handleVirtualBgSelected(type, name, customParams).then(resolve, handleFailure);
      } else if (this.context.backgrounds.webcamBackgroundURL) {
        // Apply custom background from JOIN URL parameter automatically
        // only if there's not any session background yet.
        const { filename, data, type, uniqueId } = this.context.backgrounds.webcamBackgroundURL;
        const customParams = {
          file: data,
          uniqueId,
        };

        const handleFailure = (error) => {
          this.handleVirtualBgError(error, type, filename);
          removeSessionVirtualBackgroundInfo(webcamDeviceId);
          reject(error);
        };

        this.handleVirtualBgSelected(type, filename, customParams).then(resolve, handleFailure);
      } else {
        resolve();
      }
    });
  }

  async applyStoredBrightness(deviceId = null) {
    const webcamDeviceId = deviceId || this.state.webcamDeviceId;
    const cameraBrightness = getCameraBrightnessInfo(webcamDeviceId);

    if (cameraBrightness && !isEqual(cameraBrightness, DEFAULT_BRIGHTNESS_STATE)) {
      return this.startCameraBrightness(cameraBrightness);
    }
  }

  async getCameraStream(deviceId, profile) {
    const { webcamDeviceId } = this.state;
    const { cameraAsContent, forceOpen } = this.props;

    this.setState({
      selectedProfile: profile.id,
      isStartSharingDisabled: true,
      previewError: undefined,
    });

    this.terminateCameraStream(this.currentVideoStream, webcamDeviceId);
    this.cleanupStreamAndVideo();

    try {
      // The return of doGUM is an instance of BBBVideoStream (a thin wrapper over a MediaStream)
      let bbbVideoStream = await PreviewService.doGUM(deviceId, profile);
      this.currentVideoStream = bbbVideoStream;
      const updatedDevice = this.updateDeviceId(deviceId);

      if (updatedDevice !== deviceId) {
        bbbVideoStream = await PreviewService.doGUM(updatedDevice, profile);
        this.currentVideoStream = bbbVideoStream;
      }
    } catch(error) {
      // When video preview is set to skip, we need some way to bubble errors
      // up to users; so re-throw the error
      if (!this.shouldSkipVideoPreview()) {
        console.log('@mediaCheck2 getCameraStream', error);
        this.handlePreviewError('do_gum_preview', error, 'displaying final selection');
      } else {
        throw error;
      }
    }

    // Restore virtual background if it was stored in Local/Session Storage
    try {
      if (!cameraAsContent) await this.applyStoredVirtualBg(deviceId);
    } catch (error) {
      // Only bubble up errors in this case if we're skipping the video preview
      // This is because virtual background failures are deemed critical when
      // skipping the video preview, but not otherwise
      if (this.shouldSkipVideoPreview()) {
        throw error;
      }
    }

    // Restore brightness state if it was stored in Local/Session Storage
    try {
      if (!cameraAsContent) await this.applyStoredBrightness(deviceId);
    } catch (error) {
      if (this.shouldSkipVideoPreview()) {
        throw error;
      }
    } finally {
      // Late VBG resolve, clean up tracks, stop.
      if (!this._isMounted) {
        this.terminateCameraStream(bbbVideoStream, deviceId);
        this.cleanupStreamAndVideo();
        return;
      }
      this.setState({
        isStartSharingDisabled: false,
      });
    }
  }

  displayPreview() {
    if (this.currentVideoStream && this.video) {
      this.video.srcObject = this.currentVideoStream.mediaStream;
    }
  }

  skipVideoPreview() {
    const { webcamDeviceId } = this.state;
    const { forceOpen } = this.props;

    return this.getInitialCameraStream(webcamDeviceId).then(() => {
      this.handleStartSharing();
    }).catch(error => {
      PreviewService.clearWebcamDeviceId();
      PreviewService.clearWebcamProfileId();
      removeSessionVirtualBackgroundInfo(webcamDeviceId);
      this.cleanupStreamAndVideo();
      // Mark the skip as failed so that the component will override any option
      // to skip the video preview and display the default UI
      if (this._isMounted) this.setState({ skipPreviewFailed: true });
      throw error;
    });
  }



  handleJoinAudioError = (err) => {
      const { type, errCode, errMessage } = err;
      // alert(errMessage);
      switch (type) {
        case 'MEDIA_ERROR':
          this.setState({
            content: 'help',
            errCode,
            errMessage,
            disableActions: false,
          });
          
          break;
        case 'CONNECTION_ERROR':
        default:
          this.setState({
            errCode,
            errMessage: type,
            disableActions: false,
          });
          break;
      }
    };  


  handleJoinMicrophone=()=> {
    if (this.state.disableActions && this.props.isConnecting) return;

    this.setState({
      hasError: false,
      disableActions: true,
      errorInfo: null,
    });

    this.props.joinMic().then(() => {
      this.setState({
        disableActions: false,
      });
    }).catch((err) => {
      this.handleJoinAudioError(err);
    });
  }

  disableAwayMode=()=> {
      if (!away) return;
  
      muteAway(false, true, voiceToggle);
      this.props.setAway({
        variables: {
          away: false,
        },
      });
      VideoService.setTrackEnabled(true);
  }


  handleConfirmation = (inputStream) => {
    const {
      isConnected,
      closeModal,
      //handleJoinMicrophone,
      //disableAwayMode,
    } = this.props;

      // Reset the modal to a connecting state - this kind of sucks?
      // prlanzarin Apr 04 2022
      // setContent(null);
      // if (inputStream) changeInputStream(inputStream);
  
      if (!isConnected) {
        this.handleJoinMicrophone();
        // this.disableAwayMode();
      } else {
        closeModal();
      }
    }



    toggleShowVideo=()=>{

      console.log("toggleShowVideo",this.state.showVideo);
      this.setState({showVideo:!this.state.showVideo});

    }


  handleConfirmationClick() {
    const { stream, inputDeviceId: selectedInputDeviceId } = this.state;
    const {
      isConnected,
      produceStreams,
      handleConfirmation,
      liveChangeInputDevice,
    } = this.props;

    const confirm = () => {
      // Stream generation disabled or there isn't any stream: just run the provided callback
      if (!produceStreams || !stream) return this.handleConfirmation();

      // Stream generation enabled and there is a valid input stream => call
      // the confirmation callback with the input stream as arg so it can be used
      // in upstream components. The rationale is no surplus gUM calls.
      // We're cloning it because the original will be cleaned up on unmount here.
      const clonedStream = stream.clone();

      return this.handleConfirmation(clonedStream);
    };

    if (isConnected) {
      // If connected, we need to use the in-call device change method so that all
      // components pick up the change and the peer is properly updated.
      liveChangeInputDevice(selectedInputDeviceId).catch((error) => {
        logger.warn({
          logCode: 'audiosettings_live_change_device_failed',
          extraInfo: {
            errorMessage: error?.message,
            errorStack: error?.stack,
            errorName: error?.name,
          },
        }, `Audio settings live change device failed: ${error.name}`);
      }).finally(() => {
        confirm();
      });
    } else {
      confirm();
    }
  }

  supportWarning() {
    const { intl } = this.props;

    return (
      <div>
        <Styled.Warning>!</Styled.Warning>
        <Styled.Main>{intl.formatMessage(intlMessages.iOSError)}</Styled.Main>
        <Styled.Text>{intl.formatMessage(intlMessages.iOSErrorDescription)}</Styled.Text>
        <Styled.Text>
          {intl.formatMessage(intlMessages.iOSErrorRecommendation)}
        </Styled.Text>
      </div>
    );
  }

  getFallbackLabel(webcam, index) {
    const { intl } = this.props;
    return `${intl.formatMessage(intlMessages.cameraLabel)} ${index}`
  }

  isAlreadyShared (webcamId) { 
    const { sharedDevices, cameraAsContentDeviceId } = this.props;

    return sharedDevices.includes(webcamId) || webcamId === cameraAsContentDeviceId;
  }

  isCameraAsContentDevice (deviceId) {
    const { cameraAsContentDeviceId } = this.props;

    return deviceId === cameraAsContentDeviceId;
  }

  renderDeviceSelectors() {
    const {
      intl,
      sharedDevices,
      cameraAsContent,
    } = this.props;

    const {
      webcamDeviceId,
      availableWebcams,
      selectedProfile,
    } = this.state;

    return (
      <Styled.InternCol>
        <Styled.Label htmlFor="setCam">
          {intl.formatMessage(intlMessages.cameraLabel)}
        </Styled.Label>
        { availableWebcams && availableWebcams.length > 0
          ? (
            <Styled.Select
              id="setCam"
              value={webcamDeviceId || ''}
              onChange={this.handleSelectWebcam}
            >
              {availableWebcams.map((webcam, index) => (
                <option key={webcam.deviceId} value={webcam.deviceId}>
                  {webcam.label || this.getFallbackLabel(webcam, index)}
                </option>
              ))}
            </Styled.Select>
          )
          : (
            <span>
              {intl.formatMessage(intlMessages.webcamNotFoundLabel)}
            </span>
          )
        }
        {this.renderQualitySelector()}
      </Styled.InternCol>
    );
  }

  renderQualitySelector() {
    const {
      intl,
      cameraAsContent,
    } = this.props

    const {
      selectedProfile,
      availableWebcams,
      webcamDeviceId, 
    } = this.state;

    const shared = this.isAlreadyShared(webcamDeviceId);

    if (shared) { 
      return (
        <Styled.Label>
          {intl.formatMessage(intlMessages.sharedCameraLabel)}
        </Styled.Label>
      );
    }
    
    if (cameraAsContent) return;

    const CAMERA_PROFILES = window.meetingClientSettings.public.kurento.cameraProfiles || [];
    // Filtered, without hidden profiles
    const PREVIEW_CAMERA_PROFILES = CAMERA_PROFILES.filter(p => !p.hidden);

    return (
      <>
        <Styled.Label htmlFor="setQuality">
          {intl.formatMessage(intlMessages.qualityLabel)}
        </Styled.Label>
        {PREVIEW_CAMERA_PROFILES.length > 0
          ? (
            <Styled.Select
              id="setQuality"
              value={selectedProfile || ''}
              onChange={this.handleSelectProfile}
            >
              {PREVIEW_CAMERA_PROFILES.map((profile) => {
                const label = intlMessages[`${profile.id}`]
                  ? intl.formatMessage(intlMessages[`${profile.id}`])
                  : profile.name;

                return (
                  <option key={profile.id} value={profile.id}>
                    {`${label}`}
                  </option>
                );
              })}
            </Styled.Select>
          )
          : (
            <span>
              {intl.formatMessage(intlMessages.profileNotFoundLabel)}
            </span>
          )
        }
      </>
    );
  }

  async handleBrightnessAreaChange() {
    const ENABLE_CAMERA_BRIGHTNESS = window.meetingClientSettings.public.app.enableCameraBrightness;
    const CAMERA_BRIGHTNESS_AVAILABLE = ENABLE_CAMERA_BRIGHTNESS && isVirtualBackgroundSupported();
    
    if (CAMERA_BRIGHTNESS_AVAILABLE && this.currentVideoStream) {
      if (this.currentVideoStream?.virtualBgService == null) {
        await this.startCameraBrightness();
      }

      const { wholeImageBrightness, webcamDeviceId } = this.state;
      const shared = this.isAlreadyShared(webcamDeviceId);
      this.currentVideoStream.toggleCameraBrightnessArea(!wholeImageBrightness);
      this.setState({ wholeImageBrightness: !wholeImageBrightness }, () => {
        if (shared) this.updateCameraBrightnessInfo();
      });
    }
  }

  renderBrightnessInput() {
    const {
      cameraAsContent,
      cameraAsContentDeviceId,
    } = this.props;
    const {
      webcamDeviceId,
    } = this.state;

    const ENABLE_CAMERA_BRIGHTNESS = window.meetingClientSettings.public.app.enableCameraBrightness;

    if (!ENABLE_CAMERA_BRIGHTNESS) return null;

    const { intl } = this.props;
    const { brightness, wholeImageBrightness, isStartSharingDisabled } = this.state;
    const shared = this.isAlreadyShared(webcamDeviceId);

    const origin = brightness <= 100 ? 'left' : 'right';
    const offset = origin === 'left'
      ? (brightness * 100) / 200
      : ((200 - brightness) * 100) / 200;

    if(cameraAsContent || webcamDeviceId === cameraAsContentDeviceId){ return null }

    return (
      <Styled.InternCol>
        <Styled.Label htmlFor="brightness">
          {intl.formatMessage(intlMessages.brightness)}
        </Styled.Label>
        <div aria-hidden>
          <Styled.MarkerDynamicWrapper>
            <Styled.MarkerDynamic
              ref={(ref) => this.brightnessMarker = ref}
              style={{ [origin]: `calc(${offset}% - 1rem)` }}
            >
              {brightness - 100}
            </Styled.MarkerDynamic>
          </Styled.MarkerDynamicWrapper>
        </div>
        <input
          id="brightness"
          style={{ width: '100%' }}
          type="range"
          min={0}
          max={200}
          value={brightness}
          aria-describedby={'brightness-slider-desc'}
          onChange={(e) => {
            const brightness = e.target.valueAsNumber;
            this.setCameraBrightness(brightness);
          }}
          disabled={!isVirtualBackgroundSupported() || isStartSharingDisabled}
        />
        <div style={{ display: 'none' }} id={'brightness-slider-desc'}>
          {intl.formatMessage(intlMessages.sliderDesc)}
        </div>
        <Styled.MarkerWrapper aria-hidden>
          <Styled.Marker>{'-100'}</Styled.Marker>
          <Styled.Marker>{'0'}</Styled.Marker>
          <Styled.Marker>{'100'}</Styled.Marker>
        </Styled.MarkerWrapper>
        <div style={{ display: 'flex', marginTop: '.5rem' }}>
          <Checkbox
            onChange={this.handleBrightnessAreaChange}
            checked={wholeImageBrightness}
            ariaLabel={intl.formatMessage(intlMessages.wholeImageBrightnessLabel)}
            ariaDescribedBy={'whole-image-desc'}
            ariaDesc={intl.formatMessage(intlMessages.wholeImageBrightnessDesc)}
            disabled={!isVirtualBackgroundSupported() || isStartSharingDisabled}
            label={intl.formatMessage(intlMessages.wholeImageBrightnessLabel)}
          />
        </div>
      </Styled.InternCol>
    );
  }

  renderVirtualBgSelector() {
    const { isCustomVirtualBackgroundsEnabled } = this.props;
    const { isStartSharingDisabled, webcamDeviceId } = this.state;
    const initialVirtualBgState = this.currentVideoStream ? {
      type: this.currentVideoStream.virtualBgType,
      name: this.currentVideoStream.virtualBgName,
      uniqueId: this.currentVideoStream.virtualBgUniqueId,
    } : getSessionVirtualBackgroundInfoWithDefault(webcamDeviceId);

    const {
      showThumbnails: SHOW_THUMBNAILS = true,
    } = window.meetingClientSettings.public.virtualBackgrounds;
    
    return (
      <VirtualBgSelector
        handleVirtualBgSelected={this.handleVirtualBgSelected}
        locked={isStartSharingDisabled}
        showThumbnails={SHOW_THUMBNAILS}
        initialVirtualBgState={initialVirtualBgState}
        isCustomVirtualBackgroundsEnabled={isCustomVirtualBackgroundsEnabled}
      />
    );
  }

  renderTabsContent(tabNumber) {
    const {
      cameraAsContent,
      isVirtualBackgroundsEnabled,
    } = this.props;
  
    const shouldShowVirtualBackgrounds = isVirtualBackgroundsEnabled && !cameraAsContent;
  
    return (
      <Styled.ContentCol>
        {tabNumber === 0 && (
          <Styled.Col>
            {this.renderDeviceSelectors()}
            {isVirtualBackgroundSupported() && this.renderBrightnessInput()}
          </Styled.Col>
        )}
        {tabNumber === 1 && shouldShowVirtualBackgrounds && (
          <Styled.BgnCol>
            {this.renderVirtualBgSelector()}
          </Styled.BgnCol>
        )}
      </Styled.ContentCol>
    );
  }

  renderContent(selectedTab) {
    const {
      intl,
    } = this.props;

    const {
      viewState,
      deviceError,
      previewError,
    } = this.state;
    // console.log(this.state);

    const Settings = getSettingsSingletonInstance();
    const { animations } = Settings.application;

    const containerStyle = {
      width: '60%',
      height: '25vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center', 
    };

    switch (viewState) {
      case VIEW_STATES.finding:
        return (
          <Styled.Content>
            <Styled.VideoCol>
              <div style={containerStyle}>
                <span>{intl.formatMessage(intlMessages.findingWebcamsLabel)}</span>
                <Styled.FetchingAnimation animations={animations} />
              </div>
            </Styled.VideoCol>
          </Styled.Content>
        );
      case VIEW_STATES.error:
        return (
          <Styled.Content>
            <Styled.VideoCol><div>{deviceError}</div></Styled.VideoCol>
          </Styled.Content>
        );
      case VIEW_STATES.found:
      default:
        return (
          <Styled.Content>
            <Styled.VideoCol>
              {
                previewError
                  ? (
                    <div>{previewError}</div>
                  )
                  : this.state.showVideo ? (
                    <Styled.VideoPreview
                      mirroredVideo={VideoService.mirrorOwnWebcam()}
                      id="preview"
                      data-test={VideoService.mirrorOwnWebcam() ? 'mirroredVideoPreview' : 'videoPreview'}
                      ref={(ref) => { this.video = ref; }}
                      autoPlay
                      playsInline
                      muted
                    />
                  )
                  : null
              }
            </Styled.VideoCol>
            {this.renderTabsContent(selectedTab)}
          </Styled.Content>
        );
    }
  }

  getModalTitle() {
    const { intl, cameraAsContent } = this.props;
    if (cameraAsContent) return intl.formatMessage(intlMessages.cameraAsContentSettingsTitle);
    return intl.formatMessage(intlMessages.webcamSettingsTitle);
  }

  renderModalContent(selectedTab) {
    const {
      intl,
      hasVideoStream,
      forceOpen,
      camCapReached,
      closeModal,
      
    } = this.props;


    

    const {
      isStartSharingDisabled,
      webcamDeviceId,
      deviceError,
      previewError,
      muted,
      showVideo,
      viewState,
    } = this.state;
    const shouldDisableButtons = this.shouldSkipVideoPreview()
    || !!(deviceError || previewError);

    const shared = this.isAlreadyShared(webcamDeviceId);

    const showStopAllButton = hasVideoStream && VideoService.isMultipleCamerasEnabled();


    const { isIe } = browserInfo;

    return (
      <>
        {isIe ? (
          <Styled.BrowserWarning>
            <FormattedMessage
              id="app.audioModal.unsupportedBrowserLabel"
              description="Warning when someone joins with a browser that isn't supported"
              values={{
                supportedBrowser1: <a href="https://www.google.com/chrome/">Chrome</a>,
                supportedBrowser2: <a href="https://getfirefox.com">Firefox</a>,
              }}
            />
          </Styled.BrowserWarning>
        ) : null}

        {this.renderContent(selectedTab)}
        {/* {this.props.permissionStatus} */}

        <div style={{display: 'flex', gap: '1rem'}}>
        { this.props.permissionStatus === "granted" ? this.renderAudioDeviceSelectors() : <div style={{color: 'danger', margin: '1rem'}}>{intl.formatMessage(intlMessages.helpSubtitlePermission)}</div>}
        </div>

        <div style={{display: 'flex', gap: '1rem'}}>
        <Button
          label={shouldDisableButtons ? "Please Allow Camera access" : "Leave Video"}
          data-test={showVideo ? 'leaveVideo' : 'joinVideo'}
          onClick={()=>this.toggleShowVideo()}
          hideLabel
          color={!shouldDisableButtons && showVideo ? 'primary' : 'danger'}
          icon={!shouldDisableButtons && showVideo ? 'video' : 'video_off'}
          size="lg"
          circle
          disabled={shouldDisableButtons}
          //loading={videoConnecting}
        />
        <Button
          label={this.props.permissionStatus === "granted" ? "Join Audio" : "Please Allow Microphone access"}
          data-test={this.props.permissionStatus === "granted" ? 'joinAudio' : 'joinListenOnly'}
          onClick={()=>{
            this.setState({
              muted: !muted,
            });
          }}
          hideLabel
          color={muted || this.props.permissionStatus !== "granted" ? 'danger' : 'primary'}
          icon={muted || this.props.permissionStatus !== "granted" ? 'mute' : 'unmute'}
          size="lg"
          circle
          disabled={this.props.permissionStatus !== "granted"}
          //loading={videoConnecting}
        />
        </div>

        <Styled.Footer>
          <Styled.BottomSeparator />
            <Styled.FooterContainer>
              {showStopAllButton ? (
                <Styled.ExtraActions>
                  <Styled.StopAllButton
                    color="danger"
                    label={intl.formatMessage(intlMessages.stopSharingAllLabel)}
                    onClick={this.handleStopSharingAll}
                    disabled={shouldDisableButtons}
                  />
                </Styled.ExtraActions>
              ) : null}
                {!shared && camCapReached ? (
                  <span>{intl.formatMessage(intlMessages.camCapReached)}</span>
                ) : (
                  <div style={{ display: 'flex' }}>
                      {/* <Styled.CancelButton
                        data-test="cancelSharingWebcam"
                        label={intl.formatMessage(intlMessages.cancelLabel)}
                        onClick={closeModal}
                      /> */}
                      <Styled.SharingButton
                        data-test="startSharingWebcam"
                        color={shared ? 'danger' : 'primary'}
                        label={"Join Room"}
                        onClick={shared ? this.handleStopSharing : this.handleStartSharing}
                        disabled={isStartSharingDisabled || isStartSharingDisabled === null}
                      />
                  </div>
                )}

            </Styled.FooterContainer>
        </Styled.Footer>
      </>
    );
  }



  renderAudioDeviceSelectors() {
    const {
      inputDeviceId,
      outputDeviceId,
      producingStreams,
      audioInputDevices,
      audioOutputDevices,
      findingDevices,
    } = this.state;
    const {
      intl,
      isConnecting,
      supportsTransparentListenOnly,
      withEcho,
    } = this.props;
    const { stream } = this.state;
    const blocked = producingStreams || isConnecting || findingDevices;

    if (this.props.permissionStatus === "denied") {
      
    }
    return (
      <>
        <Styled.FormElement>
          <Styled.LabelSmall htmlFor="inputDeviceSelector">
            {intl.formatMessage(intlMessages.micSourceLabel)}
            <DeviceSelector
              id="inputDeviceSelector"
              deviceId={inputDeviceId}
              devices={audioInputDevices}
              kind="audioinput"
              blocked={blocked}
              onChange={this.handleInputChange}
              intl={intl}
              supportsTransparentListenOnly={supportsTransparentListenOnly}
            />
          </Styled.LabelSmall>
        </Styled.FormElement>
        {/* <Styled.LabelSmallFullWidth htmlFor="audioStreamVolume">
          {intl.formatMessage(intlMessages.streamVolumeLabel)}
          <AudioStreamVolume stream={stream} />
        </Styled.LabelSmallFullWidth> */}
        <Styled.FormElement>
          <Styled.LabelSmall htmlFor="outputDeviceSelector">
            {intl.formatMessage(intlMessages.speakerSourceLabel)}
            <DeviceSelector
              id="outputDeviceSelector"
              deviceId={outputDeviceId}
              devices={audioOutputDevices}
              kind="audiooutput"
              blocked={blocked}
              onChange={this.handleOutputChange}
              intl={intl}
              supportsTransparentListenOnly={supportsTransparentListenOnly}
            />
          </Styled.LabelSmall>
        </Styled.FormElement>
        {/* <Styled.LabelSmall htmlFor="audioTest">
          {intl.formatMessage(intlMessages.testSpeakerLabel)}
          {!withEcho ? (
            <AudioTestContainer id="audioTest" />
          ) : (
            <LocalEchoContainer
              intl={intl}
              outputDeviceId={outputDeviceId}
              stream={stream}
            />
          )}
        </Styled.LabelSmall>
        {this.renderAudioCaptionsSelector()} */}
      </>
    );
  }

  handleSelectTab(tab) {
    this.setState({
      selectedTab: tab,
    });
  }

  render() {
    const {
      intl,
      isCamLocked,
      forceOpen,
      isOpen,
      priority,
      cameraAsContent,
      cameraAsContentDeviceId,
      isVirtualBackgroundsEnabled,
    } = this.props;

    const { selectedTab, webcamDeviceId } = this.state;
    
    const BASE_NAME = window.meetingClientSettings.public.app.basename;
    const WebcamSettingsImg = `${BASE_NAME}/resources/images/webcam_settings.svg`;
    const WebcamBackgroundImg = `${BASE_NAME}/resources/images/webcam_background.svg`;

    const darkThemeState = AppService.isDarkThemeEnabled();
    const isBlurred = Session.getItem('videoPreviewFirstOpen') && getFromUserSettings('bbb_auto_share_webcam', window.meetingClientSettings.public.kurento.autoShareWebcam);


    if (isCamLocked === true) {
      this.handleProceed();
      return null;
    }

    if (this.shouldSkipVideoPreview()) {
      return null;
    }

    const {
      deviceError,
      previewError,
    } = this.state;

    const allowCloseModal = !!(deviceError || previewError)
    || !PreviewService.getSkipVideoPreview()
      || forceOpen;

    const shouldShowVirtualBackgroundsTab = isVirtualBackgroundsEnabled
      && !cameraAsContent
      && !(webcamDeviceId === cameraAsContentDeviceId)
      && isVirtualBackgroundSupported()

    // return (<>
    // <h1>hhhhhhhhhhhhhhhhhhhh</h1>
    // </>)

    return (
      <div>
        {/* <h1>hhhhhhhhhhhhhhhhhhhh</h1> */}
      <Styled.AudioVideoPreviewModal
        // onRequestClose={this.handleProceed}
        onRequestClose={()=>{}}
        contentLabel={intl.formatMessage(intlMessages.webcamSettingsTitle)}
        shouldShowCloseButton={false}
        // shouldCloseOnOverlayClick={allowCloseModal}
        isPhone={deviceInfo.isPhone}
        data-test="webcamSettingsModal"
        {...{
          isOpen,
          priority,
        }}
        isBlurred={true}
        overlayClass2={true}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 1)',
          background: '#fff',
        }}
      >
        <Styled.Container>
    <Styled.Header>
      <Styled.WebcamTabs
        onSelect={this.handleSelectTab}
        selectedIndex={selectedTab}
              >
                <Styled.WebcamTabList>
                  <Styled.WebcamTabSelector selectedClassName="is-selected">
                    <Styled.IconSvg
                      src={WebcamSettingsImg}
                      darkThemeState={darkThemeState}
                    />
                    <span 
                      id="webcam-settings-title">{this.getModalTitle()}
                    </span>
                  </Styled.WebcamTabSelector>
                  {shouldShowVirtualBackgroundsTab && (
                  <>
                    <Styled.HeaderSeparator />
                    <Styled.WebcamTabSelector selectedClassName="is-selected">
                      <Styled.IconSvg
                        src={WebcamBackgroundImg}
                        darkThemeState={darkThemeState}
                      />
                      <span id="backgrounds-title">{intl.formatMessage(intlMessages.webcamVirtualBackgroundTitle)}</span>
                    </Styled.WebcamTabSelector>
                  </>
                )}
                </Styled.WebcamTabList>
                
              </Styled.WebcamTabs>
            </Styled.Header>

            {deviceInfo.hasMediaDevices
                ? this.renderModalContent(selectedTab)
                : this.supportWarning()
              }

          </Styled.Container>
        </Styled.AudioVideoPreviewModal>
      </div>
    );
  }
}

VideoPreview.propTypes = propTypes;
VideoPreview.defaultProps = defaultProps;

export default injectIntl(VideoPreview);
