import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./userSlice"
import reportSlice from "./reportSlice";
export const store = configureStore({
    reducer:{
        user:userSlice,
        report:reportSlice,
    }
})
