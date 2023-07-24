from django.contrib import admin
from django.urls import path, include
from freefood import views, urls
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name="index"),
    path('freefood/', include(urls)),
    path('oauth/', include('social_django.urls', namespace='social')),
    path('logout', auth_views.logout_then_login, name='logout'),
]
