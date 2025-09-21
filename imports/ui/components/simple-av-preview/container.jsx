import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { withModalMounter } from '/imports/ui/components/modal/service';
import SimpleAVPreview from './component';

export default withModalMounter(withTracker(({ mountModal, onReady }) => {
  const handleReady = (stream) => {
    if (onReady) onReady(stream);
  };

  return {
    onReady: handleReady,
  };
})(SimpleAVPreview));
