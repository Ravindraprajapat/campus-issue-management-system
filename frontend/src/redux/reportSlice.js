import { createSlice } from "@reduxjs/toolkit";

const reportSlice = createSlice({
  name: "report",
  initialState: {
    reports: [],
  },
  reducers: {

    setReports: (state, action) => {
      state.reports = action.payload;
    },

    addNewIssue: (state, action) => {
      state.reports = [action.payload, ...state.reports];
    },

  },
});

export const { setReports, addNewIssue } = reportSlice.actions;
export default reportSlice.reducer;