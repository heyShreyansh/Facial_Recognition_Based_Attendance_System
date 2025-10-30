import React from 'react'
import { Outlet } from 'react-router-dom'

export default function AdminLayout(){
  return (
    <div className="admin-layout-root">
      <Outlet />
    </div>
  )
}
