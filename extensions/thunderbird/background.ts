import { getApi, openAnalysis } from './thunderbirdApi';

const api = getApi();

api.messageDisplayAction.onClicked.addListener((tab) => {
  void openAnalysis(api, tab.id);
});
