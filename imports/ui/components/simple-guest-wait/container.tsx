import { withTracker } from 'meteor/react-meteor-data';
import { withModalMounter } from '/imports/ui/components/modal/service';
import SimpleGuestWait from './component';

export default withModalMounter(withTracker(() => {
  return {
    // Add any props you want to pass to the component
  };
})(SimpleGuestWait));
