import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { bootstrapExplore } from '@/features/explore/bootstrapExplore'
import { RootState } from '@/utils/redux/store'
import { useApi } from '@/api'

export function useExploreController() {
  const dispatch = useDispatch()
  const api = useApi()
  const ranRef = useRef(false)

  const activeServer = useSelector(selectActiveServer)
  const hasInitialFill = useSelector(
    (s: RootState) => s.explore.hasInitialFill
  )

  useEffect(() => {
    if (ranRef.current) return
    if (!activeServer?.isAuthenticated) return
    if (hasInitialFill) return

    ranRef.current = true

    bootstrapExplore(dispatch, api)
  }, [activeServer?.isAuthenticated, hasInitialFill, dispatch, api])
}