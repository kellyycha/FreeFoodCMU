from django import template

register = template.Library()


def rating_to_stars(value):
    return [(i+1) for i in range(round(float(value)))]

def rating_to_blanks(value):
    return [(i+1) for i in range(round(float(value)), 5)]

register.filter('rating_to_stars', rating_to_stars)
register.filter('rating_to_blanks', rating_to_blanks)