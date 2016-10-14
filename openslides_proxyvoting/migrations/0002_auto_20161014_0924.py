# -*- coding: utf-8 -*-
# Generated by Django 1.10.2 on 2016-10-14 07:24
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('openslides_proxyvoting', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='votingproxy',
            name='proxy',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mandates', to=settings.AUTH_USER_MODEL),
        ),
    ]
