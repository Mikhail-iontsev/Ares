import getFilePath from "@/data/services/getFilePath";
import loadFile from "@/data/services/loadFile";
import processors from "@/data/store/modules/view/processors";
import { SET_DATA } from "./mutations.type";
import {
  FETCH_DATA,
  FETCH_MULTIPLE_BY_RELEASE,
  FETCH_MULTIPLE_BY_SOURCE,
} from "@/data/store/modules/view/actions.type";

const state = {
  data: [],
};

const getters = {
  getData: (state) => {
    return state.data;
  },
};

const actions = {
  async [FETCH_DATA]({ commit, dispatch, rootState }, payload) {
    const promises = payload.files.map((file) => {
      return loadFile(getFilePath(rootState.route.params)[file.name], {
        required: file.required,
      });
    });

    await Promise.allSettled(promises).then((responses) => {
      const data = responses.reduce(
        (obj, currValue, index) => ({
          ...obj,
          [payload.files[index].name]: processors[payload.files[index].name]
            ? processors[payload.files[index].name](
                currValue.value?.response?.data
              )
            : currValue.value?.response?.data,
        }),
        {}
      );
      commit(SET_DATA, data);
    });
  },

  async [FETCH_MULTIPLE_BY_SOURCE](
    //todo save cdm data on data load
    { commit, rootState, rootGetters },
    payload
  ) {
    const promises = payload.files.reduce(
      (obj, file) => ({
        ...obj,
        [file]: rootGetters.getSources.map((source) => {
          return loadFile(
            getFilePath({
              cdm: source.cdm_source_key,
              release: source.releases[0].release_id,
              domain: rootState.route.params.domain,
              concept: rootState.route.params.concept,
            })[file]
          );
        }),
      }),
      {}
    );

    const data = {};
    for (const file in promises) {
      await Promise.allSettled(promises[file]).then((responses) => {
        data[file] = responses
          .filter((response) => response.value?.response?.data)
          .map((filtered) => filtered.value.response.data);
      });
    }

    commit(SET_DATA, data);
  },

  async [FETCH_MULTIPLE_BY_RELEASE](
    { commit, rootState, rootGetters },
    payload
  ) {
    const promises = payload.files.reduce(
      (obj, file) => ({
        ...obj,
        [file]: rootGetters.getSelectedSource.releases.map((release) => {
          return loadFile(
            getFilePath({
              cdm: rootGetters.getSelectedSource.cdm_source_key,
              release: release.release_id,
              domain: rootState.route.params.domain,
              concept: rootState.route.params.concept,
            })[file],
            release.release_name
          );
        }),
      }),
      {}
    );
    const data = {};
    for (const file in promises) {
      await Promise.allSettled(promises[file]).then((responses) => {
        data[file] = responses
          .filter((response) => response.value?.response?.data)
          .map((filtered) => ({
            data: filtered.value.response.data,
            release: filtered.value.payload,
          }));
      });
    }
    commit(SET_DATA, data);
  },
};

const mutations = {
  [SET_DATA](state, payload) {
    state.data = payload;
  },
};

export default {
  state,
  getters,
  actions,
  mutations,
};
