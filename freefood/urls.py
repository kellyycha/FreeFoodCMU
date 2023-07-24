from django.urls import path
from . import views

urlpatterns = [
    # JS API commands
    path("get-map-markers/", views.get_map_markers),
    path("get-map-history/", views.get_map_history),
    path("update-date/", views.update_date, name="update-date"),
    path("update-sort/<str:sortMethod>/", views.update_sort),
    path("update-toggle-show/", views.update_toggle_show), 
    path("update-dietary-restrictions/", views.update_dietary_restrictions, name="update-dietary"),
    path("image-by-event/<int:id>", views.get_image_by_event, name="image-by-event"), 
    path("image-by-id/<int:id>", views.get_image_by_id, name="image-by-id"),
    path("refresh-ajax/", views.updateAllFilters),
    path("submit-rating/<int:event_id>/<int:new_rating>", views.add_rating),
    path("markFinished/<int:event_id>", views.availability_finished),
    path("markAvailable/<int:event_id>", views.availability_available),
    path('add-comment/<int:event_id>', views.add_comment),
    path('get-global/<int:event_id>', views.get_comment),
    path("delete-event/<int:id>", views.delete_event, name="delete-event"),
    
    # Pages: 
    path('', views.index, name="index"),
    path('map', views.map, name="map"),
    path('heatmap', views.heatmap, name="heatmap"),
    path('event/<int:id>/', views.event_view, name="event_page"),
    path('new-event/', views.new_event, name="new_event"),
    path('edit-event/<int:id>/', views.edit_event, name="edit_event"),
    path('profile/', views.profile, name="profile"),
]