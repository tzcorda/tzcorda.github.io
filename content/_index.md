---
# Leave the homepage title empty to use the site title
title: ""
date: 2022-10-24
type: landing

design:
  # Default section spacing
  spacing: "6rem"

sections:
  - block: resume-biography-3
    content:
      # Choose a user profile to display (a folder name within `content/authors/`)
      username: admin
      text: ""
      # Show a call-to-action button under your biography? (optional)
      button:
        text: Download CV
        url: uploads/resume.pdf
    design:
      css_class: dark
      background:
        color: black
        image:
          # Add your image background to `assets/media/`.
          filename: stacked-peaks.svg
          filters:
            brightness: 1.0
          size: cover
          position: center
          parallax: false
  - block: markdown
    content:
      title: 'Current research'
      subtitle: ''
      text: |-
        I am a <span style="background-color: #FD754688; color:white;">PostDoctoral Research Fellow</span> at the Department of Social and Political Sciences of the University of Milan. ​Currently, I am also co-chair of the Standing Group on Political Regimes at SISP (Italian Political Science Association) and an Associate Research Fellow at ISPI. My main areas of research are <span style="color:#E93F5C;">authoritarianism</span>, the comparative analysis of political regimes' trajectories of <span style="color:#E93F5C;">democratization/autocratization</span>, and the role sanctions and other forms of <span style=" color:#E93F5C;">foreign pressure</span> by regional organizations and extra-regional powers have on these trajectories, with a regional focus on Africa.
        
        Previously, I collaborated on a research project of the University of Sussex and funded by the European Research Council (ERC) on Violence, Elites, and Resilience in States Under Stress (VERSUS), focusing mostly on Ethiopia’s political crises and conflicts (2020-2022). In 2022, I received a PhD in Political Studies, with a dissertation on the internal decision-making processes in countries targeted by international sanctions. Prior to my PhD, I worked three years on global policy issues for the Africa Programme of the Italian Institute for International Political Studies (ISPI), the EU’s European External Action Service (EEAS), and the Scalabrini Centre of Cape Town (SCCT).
        
        Now based in Italy. Long ago, also in Brussels, ​​Tehran, and ​​Cape Town.

    design:
      columns: '1'
  - block: collection
    content:
      title: Recent Publications
      text: ""
      filters:
        folders:
          - publication
        exclude_featured: false
    design:
      view: citation
  - block: collection
    id: news
    content:
      title: Recent Data
      subtitle: ''
      text: ''
      # Page type to display. E.g. post, talk, publication...
      page_type: post
      # Choose how many pages you would like to display (0 = all pages)
      count: 5
      # Filter on criteria
      filters:
        author: ""
        category: ""
        tag: ""
        exclude_featured: false
        exclude_future: false
        exclude_past: false
        publication_type: ""
      # Choose how many pages you would like to offset by
      offset: 0
      # Page order: descending (desc) or ascending (asc) date.
      order: desc
    design:
      # Choose a layout view
      view: date-title-summary
      # Reduce spacing
      spacing:
        padding: [0, 0, 0, 0]
---
